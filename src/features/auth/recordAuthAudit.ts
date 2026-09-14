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

/** ログイン成功メール。失敗してもログイン自体は止めない */
async function requestLoginNotify(auditId: string): Promise<void> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const accessToken = session?.access_token
    if (!accessToken) return

    await fetch('/api/auth/login-notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ auditId }),
    })
  } catch (error) {
    console.error(
      '[login_notify]',
      error instanceof Error ? error.message : error,
    )
  }
}

/** サーバー側 headers 由来で auth_audit_logs に記録（§6.15） */
export async function recordAuthAuditEvent(
  event: 'login_success' | 'logout',
  clinicId: string | null = readActiveClinicIdForAudit(),
): Promise<void> {
  const { data, error } = await supabase.rpc('log_auth_audit_event', {
    p_event: event,
    p_clinic_id: clinicId,
  })
  if (error) {
    console.error('[auth_audit]', event, error.message)
    return
  }
  if (event === 'login_success' && typeof data === 'string' && data) {
    void requestLoginNotify(data)
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
