import { createServiceSupabaseClient } from '../admins/createServiceClient.ts'
import { createUserSupabaseClient } from '../schedule/createUserClient.ts'
import {
  buildLoginNotifyEmail,
  resolveLoginNotifyTo,
} from './loginNotifyEmail.ts'

const AUDIT_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const claimedAuditIds = new Set<string>()

export type NotifyLoginSuccessResult =
  | { ok: true; sent: boolean }
  | {
      ok: false
      code: 'unauthorized' | 'forbidden' | 'bad_request' | 'not_configured' | 'internal'
      error: string
    }

export type LoginAuditRow = {
  id: string
  userId: string
  event: string
  ip: string | null
  userAgent: string | null
  createdAt: string
  metadata: unknown
  email: string | null
  displayName: string | null
}

export type NotifyLoginSuccessDeps = {
  getUser: (
    accessToken: string,
  ) => Promise<{ id: string; email: string | null } | null>
  loadAudit: (
    auditId: string,
  ) => Promise<LoginAuditRow | null | 'not_configured'>
  sendEmail: (input: {
    to: string
    from: string
    subject: string
    text: string
    idempotencyKey: string
  }) => Promise<{ ok: true } | { ok: false; message: string }>
}

const PUBLIC_ERROR = {
  unauthorized: 'ログインが必要です',
  forbidden: '権限がありません',
  bad_request: '通知の対象が不正です',
  not_configured: 'ログイン通知の準備がまだ完了していません',
  internal: 'ログイン通知に失敗しました',
} as const

function fail(
  code: Exclude<NotifyLoginSuccessResult, { ok: true }>['code'],
): NotifyLoginSuccessResult {
  return { ok: false, code, error: PUBLIC_ERROR[code] }
}

export function resetLoginNotifyIdempotencyForTests(): void {
  claimedAuditIds.clear()
}

function readNotifyFrom(env: NodeJS.ProcessEnv): string | null {
  const value = env.LOGIN_NOTIFY_FROM?.trim()
  return value || null
}

function readResendApiKey(env: NodeJS.ProcessEnv): string | null {
  const value = env.RESEND_API_KEY?.trim()
  return value || null
}

export function createNotifyLoginSuccessDeps(
  env: NodeJS.ProcessEnv = process.env,
): NotifyLoginSuccessDeps {
  return {
    async getUser(accessToken) {
      const userClient = createUserSupabaseClient(accessToken, env)
      const { data, error } = await userClient.auth.getUser(accessToken)
      if (error || !data.user) return null
      return { id: data.user.id, email: data.user.email ?? null }
    },
    async loadAudit(auditId) {
      let service
      try {
        service = createServiceSupabaseClient(env)
      } catch (error) {
        if (error instanceof Error && error.message === 'not_configured') {
          return 'not_configured'
        }
        throw error
      }

      const { data: log, error: logError } = await service
        .from('auth_audit_logs')
        .select('id, user_id, event, ip, user_agent, created_at, metadata')
        .eq('id', auditId)
        .maybeSingle()

      if (logError || !log?.user_id) return null

      const { data: profile } = await service
        .from('profiles')
        .select('email, display_name')
        .eq('id', log.user_id)
        .maybeSingle()

      return {
        id: log.id,
        userId: log.user_id,
        event: log.event,
        ip: log.ip,
        userAgent: log.user_agent,
        createdAt: log.created_at,
        metadata: log.metadata,
        email: profile?.email ?? null,
        displayName: profile?.display_name ?? null,
      }
    },
    async sendEmail(input) {
      const apiKey = readResendApiKey(env)
      if (!apiKey) return { ok: false, message: 'not_configured' }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': input.idempotencyKey,
        },
        body: JSON.stringify({
          from: input.from,
          to: [input.to],
          subject: input.subject,
          text: input.text,
        }),
      })

      if (!response.ok) {
        return { ok: false, message: `resend_${response.status}` }
      }
      return { ok: true }
    },
  }
}

export async function notifyLoginSuccess(
  input: { accessToken: string; auditId: string },
  deps: NotifyLoginSuccessDeps = createNotifyLoginSuccessDeps(),
  env: NodeJS.ProcessEnv = process.env,
): Promise<NotifyLoginSuccessResult> {
  if (!input.accessToken.trim()) return fail('unauthorized')

  const auditId = input.auditId.trim().toLowerCase()
  if (!AUDIT_ID_RE.test(auditId)) return fail('bad_request')

  const user = await deps.getUser(input.accessToken)
  if (!user) return fail('unauthorized')

  const audit = await deps.loadAudit(auditId)
  if (audit === 'not_configured') return fail('not_configured')
  if (!audit) return fail('bad_request')
  if (audit.userId !== user.id) return fail('forbidden')
  if (audit.event !== 'login_success') return { ok: true, sent: false }

  const from = readNotifyFrom(env)
  if (!from) return fail('not_configured')

  if (claimedAuditIds.has(auditId)) {
    return { ok: true, sent: false }
  }
  claimedAuditIds.add(auditId)

  const mail = buildLoginNotifyEmail({
    displayName: audit.displayName,
    email: audit.email ?? user.email,
    createdAt: audit.createdAt,
    ip: audit.ip,
    userAgent: audit.userAgent,
    metadata: audit.metadata,
  })

  const sent = await deps.sendEmail({
    to: resolveLoginNotifyTo(env),
    from,
    subject: mail.subject,
    text: mail.text,
    idempotencyKey: `login-notify-${auditId}`,
  })

  if (!sent.ok) {
    claimedAuditIds.delete(auditId)
    if (sent.message === 'not_configured') return fail('not_configured')
    return fail('internal')
  }

  return { ok: true, sent: true }
}
