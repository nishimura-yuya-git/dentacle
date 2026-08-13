import { supabase } from '@/lib/supabase'

export type FeedbackChatMessage = {
  id: string
  role: 'user' | 'system'
  body: string
  createdAt: string
}

export type SendFeedbackResult = {
  threadId: string
  issueNumber: number
  issueUrl: string
  messages: FeedbackChatMessage[]
}

/**
 * ご意見1通をサーバーへ送り、GitHub Issue / コメントにする。
 */
export async function sendFeedback(input: {
  body: string
  clinicId: string | null
  pagePath: string
  threadId: string | null
}): Promise<SendFeedbackResult> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError || !session?.access_token) {
    throw new Error(sessionError?.message || 'ログインセッションが必要です')
  }

  const response = await fetch('/api/feedback/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      body: input.body,
      clinicId: input.clinicId ?? '',
      pagePath: input.pagePath,
      threadId: input.threadId ?? '',
    }),
  })

  const payload = (await response.json().catch(() => null)) as
    | {
        ok?: boolean
        error?: string
        threadId?: string
        issueNumber?: number
        issueUrl?: string
        messages?: { id: string; role: 'user' | 'system'; body: string; createdAt: string }[]
      }
    | null

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || `ご意見の送信に失敗しました（HTTP ${response.status}）`)
  }

  return {
    threadId: payload.threadId ?? '',
    issueNumber: payload.issueNumber ?? 0,
    issueUrl: payload.issueUrl ?? '',
    messages: payload.messages ?? [],
  }
}
