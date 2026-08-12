import { supabase } from '@/lib/supabase'

const ACTIVE_CLINIC_STORAGE_KEY = 'dentacle.activeClinicId'

/** ヘッダーで選択中のクリニック（未選択なら null） */
export function readActiveClinicIdForAudit(): string | null {
  try {
    const value = localStorage.getItem(ACTIVE_CLINIC_STORAGE_KEY)?.trim()
    return value || null
  } catch {
    return null
  }
}

/** サーバー側 headers 由来で auth_audit_logs に記録（§6.15） */
export async function recordAuthAuditEvent(
  event: 'login_success' | 'logout',
  clinicId: string | null = readActiveClinicIdForAudit(),
): Promise<void> {
  const { error } = await supabase.rpc('log_auth_audit_event', {
    p_event: event,
    p_clinic_id: clinicId,
  })
  if (error) {
    console.error('[auth_audit]', event, error.message)
  }
}

/** ブロックIPなら false。運営はサーバ側でバイパス */
export async function assertAuthIpAllowed(): Promise<{
  allowed: boolean
  errorMessage: string | null
}> {
  const { data, error } = await supabase.rpc('is_request_ip_blocked')
  if (error) {
    console.error('[auth_ip_block]', error.message)
    // 判定不能時はロックアウト回避のため許可（ログのみ）
    return { allowed: true, errorMessage: null }
  }
  if (data === true) {
    return {
      allowed: false,
      errorMessage:
        'このIPアドレスからのログインは制限されています。運営にお問い合わせください。',
    }
  }
  return { allowed: true, errorMessage: null }
}

export async function blockAuthIp(
  ip: string,
  reason?: string,
): Promise<{ ok: boolean; errorMessage: string | null }> {
  const { error } = await supabase.rpc('block_auth_ip', {
    p_ip: ip.trim(),
    p_reason: reason?.trim() || null,
  })
  if (error) {
    return { ok: false, errorMessage: error.message }
  }
  return { ok: true, errorMessage: null }
}

export async function unblockAuthIp(
  ip: string,
): Promise<{ ok: boolean; errorMessage: string | null }> {
  const { error } = await supabase.rpc('unblock_auth_ip', {
    p_ip: ip.trim(),
  })
  if (error) {
    return { ok: false, errorMessage: error.message }
  }
  return { ok: true, errorMessage: null }
}
