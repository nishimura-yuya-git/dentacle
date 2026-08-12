import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

export type PlatformMfaGate =
  | { status: 'ok' }
  | { status: 'enroll' }
  | { status: 'challenge'; factorId: string }

type AppClient = SupabaseClient<Database>

/** 運営のみ TOTP を必須化。一般ユーザーは常に ok */
export async function evaluatePlatformAdminMfaGate(
  client: AppClient,
  isPlatformAdmin: boolean,
): Promise<PlatformMfaGate> {
  if (!isPlatformAdmin) return { status: 'ok' }

  const { data: aal, error: aalError } = await client.auth.mfa.getAuthenticatorAssuranceLevel()
  if (aalError) {
    console.error(aalError)
    return { status: 'enroll' }
  }
  if (aal?.currentLevel === 'aal2') return { status: 'ok' }

  const { data: factors, error: factorsError } = await client.auth.mfa.listFactors()
  if (factorsError) {
    console.error(factorsError)
    return { status: 'enroll' }
  }

  const verified = factors?.totp?.find((factor) => factor.status === 'verified')
  if (verified) {
    return { status: 'challenge', factorId: verified.id }
  }
  return { status: 'enroll' }
}

export async function fetchIsPlatformAdmin(client: AppClient): Promise<boolean> {
  const { data, error } = await client.rpc('is_platform_admin')
  if (error) {
    console.error(error)
    return false
  }
  return Boolean(data)
}
