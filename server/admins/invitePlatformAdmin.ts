import { createUserSupabaseClient } from '../schedule/createUserClient.ts'
import { createServiceSupabaseClient } from './createServiceClient.ts'
import { isAlreadyRegisteredAuthError, normalizeInviteEmail } from './inviteEmail.ts'
import { resolveInviteRedirectTo } from './inviteRedirect.ts'
import { toPublicAdminInviteError } from './publicErrors.ts'

const INVITE_COOLDOWN_MS = 15_000
const profileWaitMs = [0, 200, 400] as const

type SlotState = { startedAt: number; finishedAt: number | null }
const inviteSlots = new Map<string, SlotState>()

export type InvitePlatformAdminSuccess = {
  ok: true
  invited: boolean
}

export type InvitePlatformAdminFailure = {
  ok: false
  code: 'unauthorized' | 'forbidden' | 'bad_request' | 'rate_limited' | 'not_configured' | 'internal'
  error: string
}

export type InvitePlatformAdminResult = InvitePlatformAdminSuccess | InvitePlatformAdminFailure

export type InvitePlatformAdminDeps = {
  getUserId: (accessToken: string) => Promise<string | null>
  isPlatformAdmin: (accessToken: string) => Promise<boolean>
  inviteUserByEmail: (
    email: string,
    redirectTo: string,
  ) => Promise<{ ok: true } | { ok: false; message: string }>
  grantByEmail: (
    accessToken: string,
    email: string,
    options?: { waitForProfile?: boolean },
  ) => Promise<{ ok: true } | { ok: false; message: string }>
}

function fail(
  code: InvitePlatformAdminFailure['code'],
  override?: string,
): InvitePlatformAdminFailure {
  return { ok: false, code, error: toPublicAdminInviteError(code, override) }
}

function grantPublicMessage(message: string): string | undefined {
  if (
    message.includes('すでに運営') ||
    message.includes('クリニックの所属') ||
    message.includes('見つかりません') ||
    message.includes('メールアドレスを入力')
  ) {
    return message
  }
  return undefined
}

function tryAcquireInviteSlot(userId: string, now = Date.now()): boolean {
  const existing = inviteSlots.get(userId)
  if (existing) {
    if (existing.finishedAt === null) return false
    if (now < existing.finishedAt + INVITE_COOLDOWN_MS) return false
  }
  inviteSlots.set(userId, { startedAt: now, finishedAt: null })
  return true
}

function releaseInviteSlot(userId: string, now = Date.now()): void {
  const existing = inviteSlots.get(userId)
  if (!existing) return
  inviteSlots.set(userId, { startedAt: existing.startedAt, finishedAt: now })
}

export function resetInviteRateLimitForTests(): void {
  inviteSlots.clear()
}

export function createInvitePlatformAdminDeps(
  env: NodeJS.ProcessEnv = process.env,
): InvitePlatformAdminDeps {
  return {
    async getUserId(accessToken) {
      const userClient = createUserSupabaseClient(accessToken, env)
      const { data, error } = await userClient.auth.getUser(accessToken)
      if (error || !data.user) return null
      return data.user.id
    },
    async isPlatformAdmin(accessToken) {
      const userClient = createUserSupabaseClient(accessToken, env)
      const { data, error } = await userClient.rpc('is_platform_admin')
      return !error && data === true
    },
    async inviteUserByEmail(email, redirectTo) {
      const service = createServiceSupabaseClient(env)
      const { error } = await service.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: {
          must_set_password: true,
          invite_kind: 'platform_admin',
        },
      })
      if (error) return { ok: false, message: error.message }
      return { ok: true }
    },
    async grantByEmail(accessToken, email, options) {
      const userClient = createUserSupabaseClient(accessToken, env)
      const waits = options?.waitForProfile ? profileWaitMs : ([0] as const)
      for (const wait of waits) {
        if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
        const { error } = await userClient.rpc('grant_platform_admin', { p_email: email })
        if (!error) return { ok: true }
        if (!error.message.includes('見つかりません')) {
          return { ok: false, message: error.message }
        }
      }
      return { ok: false, message: '該当するユーザーが見つかりません' }
    },
  }
}

export async function invitePlatformAdmin(
  input: { accessToken: string; email: string; origin?: string },
  deps: InvitePlatformAdminDeps = createInvitePlatformAdminDeps(),
  env: NodeJS.ProcessEnv = process.env,
): Promise<InvitePlatformAdminResult> {
  if (!input.accessToken.trim()) return fail('unauthorized')

  const email = normalizeInviteEmail(input.email)
  if (!email) return fail('bad_request')

  const userId = await deps.getUserId(input.accessToken)
  if (!userId) return fail('unauthorized')
  if (!(await deps.isPlatformAdmin(input.accessToken))) return fail('forbidden')

  if (!tryAcquireInviteSlot(userId)) return fail('rate_limited')

  try {
    const existing = await deps.grantByEmail(input.accessToken, email)
    if (existing.ok) return { ok: true, invited: false }
    if (!existing.message.includes('見つかりません')) {
      return fail('internal', grantPublicMessage(existing.message))
    }

    const redirectTo = resolveInviteRedirectTo(input.origin, env)
    const invited = await deps.inviteUserByEmail(email, redirectTo)
    if (!invited.ok) {
      if (isAlreadyRegisteredAuthError(invited.message)) {
        const granted = await deps.grantByEmail(input.accessToken, email, {
          waitForProfile: true,
        })
        if (!granted.ok) return fail('internal', grantPublicMessage(granted.message))
        return { ok: true, invited: false }
      }
      return fail('internal')
    }

    const granted = await deps.grantByEmail(input.accessToken, email, {
      waitForProfile: true,
    })
    if (!granted.ok) return fail('internal', grantPublicMessage(granted.message))
    return { ok: true, invited: true }
  } catch (error) {
    if (error instanceof Error && error.message === 'not_configured') {
      return fail('not_configured')
    }
    return fail('internal')
  } finally {
    releaseInviteSlot(userId)
  }
}
