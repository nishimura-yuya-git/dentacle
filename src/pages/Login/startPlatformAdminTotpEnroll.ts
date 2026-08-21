import { APP_DISPLAY_NAME } from '../../config/appName.ts'

export type PlatformAdminTotpEnrollResult =
  | { ok: true; factorId: string; qrCode: string; secret: string }
  | { ok: false }

type FactorRow = { id: string; status: string }

type MfaClient = {
  auth: {
    mfa: {
      listFactors: () => Promise<{
        data: { all?: FactorRow[]; totp?: FactorRow[] } | null
        error: { message: string } | null
      }>
      unenroll: (args: { factorId: string }) => Promise<{ error: { message: string } | null }>
      enroll: (args: { factorType: 'totp'; friendlyName: string }) => Promise<{
        data: { id: string; totp: { qr_code: string; secret: string } } | null
        error: { message: string } | null
      }>
    }
  }
}

const FRIENDLY_NAME = `${APP_DISPLAY_NAME}運営`

const inflightByUserId = new Map<string, Promise<PlatformAdminTotpEnrollResult>>()

export function resetPlatformAdminTotpEnrollCacheForTests() {
  inflightByUserId.clear()
}

function collectFactors(data: { all?: FactorRow[]; totp?: FactorRow[] } | null): FactorRow[] {
  const seen = new Set<string>()
  const rows: FactorRow[] = []
  for (const factor of [...(data?.all ?? []), ...(data?.totp ?? [])]) {
    if (seen.has(factor.id)) continue
    seen.add(factor.id)
    rows.push(factor)
  }
  return rows
}

async function removeUnverifiedFactors(client: MfaClient) {
  const { data } = await client.auth.mfa.listFactors()
  for (const factor of collectFactors(data)) {
    if (factor.status !== 'unverified') continue
    await client.auth.mfa.unenroll({ factorId: factor.id })
  }
}

async function enrollOnce(client: MfaClient): Promise<PlatformAdminTotpEnrollResult> {
  await removeUnverifiedFactors(client)
  let { data, error } = await client.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: FRIENDLY_NAME,
  })
  if (error || !data?.totp?.qr_code || !data.totp.secret) {
    await removeUnverifiedFactors(client)
    const retry = await client.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: FRIENDLY_NAME,
    })
    data = retry.data
    error = retry.error
  }
  if (error || !data?.totp?.qr_code || !data.totp.secret) return { ok: false }
  return {
    ok: true,
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  }
}

/** 同じユーザーの登録開始は1本化する。StrictMode の二重起動で名前衝突しないようにする。 */
export function startPlatformAdminTotpEnroll(
  userId: string,
  client: MfaClient,
): Promise<PlatformAdminTotpEnrollResult> {
  const existing = inflightByUserId.get(userId)
  if (existing) return existing

  const started = enrollOnce(client).then(
    (result) => {
      if (!result.ok) inflightByUserId.delete(userId)
      return result
    },
    () => {
      inflightByUserId.delete(userId)
      return { ok: false } as const
    },
  )
  inflightByUserId.set(userId, started)
  return started
}
