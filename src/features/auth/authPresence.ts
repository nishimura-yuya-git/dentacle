import { supabase } from '@/lib/supabase'
import { readActiveClinicIdForAudit } from '@/features/auth/recordAuthAudit'
import {
  AUTH_PRESENCE_ONLINE_WITHIN_SECONDS,
  AUTH_PRESENCE_POLL_SECONDS,
} from '@/features/auth/authPresenceStatus'

export {
  AUTH_PRESENCE_ONLINE_WITHIN_SECONDS,
  AUTH_PRESENCE_POLL_SECONDS,
  isAuthPresenceOnline,
} from '@/features/auth/authPresenceStatus'

export type AuthPresenceRow = {
  user_id: string
  display_name: string | null
  email: string | null
  clinic_id: string | null
  clinic_name: string | null
  ip: string | null
  user_agent: string | null
  last_seen_at: string
}

/** ログイン中クライアントからの在席ハートビート */
export async function touchAuthPresence(
  clinicId: string | null = readActiveClinicIdForAudit(),
): Promise<void> {
  const { error } = await supabase.rpc('touch_auth_presence', {
    p_clinic_id: clinicId,
  })
  if (error) {
    console.error('[auth_presence]', 'touch', error.message)
  }
}

/** ログアウト時に在席行を消す（失敗しても続行） */
export async function clearAuthPresence(): Promise<void> {
  const { error } = await supabase.rpc('clear_auth_presence')
  if (error) {
    console.error('[auth_presence]', 'clear', error.message)
  }
}

/** 運営向け: 在席一覧（ユーザー単位） */
export async function listAuthPresence(
  withinSeconds: number = AUTH_PRESENCE_ONLINE_WITHIN_SECONDS,
): Promise<{ rows: AuthPresenceRow[]; errorMessage: string | null }> {
  const { data, error } = await supabase.rpc('list_auth_presence', {
    p_within_seconds: withinSeconds,
  })
  if (error) {
    return { rows: [], errorMessage: error.message }
  }
  return { rows: (data ?? []) as AuthPresenceRow[], errorMessage: null }
}
