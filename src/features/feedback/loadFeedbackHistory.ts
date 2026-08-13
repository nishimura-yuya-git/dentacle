import { supabase } from '@/lib/supabase'
import type { FeedbackChatMessage } from '@/features/feedback/sendFeedback'

export type FeedbackHistoryThread = {
  id: string
  title: string
  issueNumber: number | null
  issueUrl: string | null
  createdAt: string
  messages: FeedbackChatMessage[]
}

/** 自分のご意見履歴（RLS）。最新1件をチャットに表示する */
export async function loadLatestFeedbackThread(): Promise<FeedbackHistoryThread | null> {
  const { data: threads, error: threadError } = await supabase
    .from('feedback_threads')
    .select('id, title, github_issue_number, github_issue_url, created_at')
    .order('created_at', { ascending: false })
    .limit(1)

  if (threadError) {
    throw new Error(threadError.message)
  }
  const thread = threads?.[0]
  if (!thread) return null

  const { data: rows, error: messageError } = await supabase
    .from('feedback_messages')
    .select('id, author_role, body, created_at')
    .eq('thread_id', thread.id)
    .order('created_at', { ascending: true })

  if (messageError) {
    throw new Error(messageError.message)
  }

  const messages: FeedbackChatMessage[] = (rows ?? [])
    .filter((row) => row.author_role === 'user' || row.author_role === 'system')
    .map((row) => ({
      id: row.id,
      role: row.author_role as 'user' | 'system',
      body: row.body,
      createdAt: row.created_at,
    }))

  return {
    id: thread.id,
    title: thread.title,
    issueNumber: thread.github_issue_number,
    issueUrl: thread.github_issue_url,
    createdAt: thread.created_at,
    messages,
  }
}
