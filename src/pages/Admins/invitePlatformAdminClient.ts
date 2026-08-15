import { supabase } from '@/lib/supabase'

export type InvitePlatformAdminClientResult =
  | { ok: true; invited: boolean }
  | { ok: false; message: string }

export async function invitePlatformAdminByEmail(
  email: string,
): Promise<InvitePlatformAdminClientResult> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError || !session?.access_token) {
    return { ok: false, message: 'ログインが必要です' }
  }

  const response = await fetch('/api/admins/invite', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ email: email.trim() }),
  })

  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; invited?: boolean; error?: string }
    | null

  if (!response.ok || !payload?.ok) {
    return {
      ok: false,
      message: payload?.error || '運営の招待に失敗しました。',
    }
  }

  return { ok: true, invited: payload.invited === true }
}
