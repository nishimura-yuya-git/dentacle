import { supabase } from '@/lib/supabase'
import { FEEDBACK_HISTORY_LOAD_FAILED } from '@/features/feedback/feedbackSecurityContract'
import type { FeedbackChatMessage } from '@/features/feedback/sendFeedback'
import { pickFeedbackThread } from '@/features/feedback/pickFeedbackThread'

export type FeedbackHistoryThread = {
  id: string
  title: string
  issueNumber: number | null
  issueUrl: string | null
  createdAt: string
  hasUnreadReply: boolean
  messages: FeedbackChatMessage[]
}

type FeedbackThreadRow = {
  id: string
  title: string
  github_issue_number: number | null
  github_issue_url: string | null
  created_at: string
  has_unread_reply: boolean
}

const THREAD_COLUMNS =
  'id, title, github_issue_number, github_issue_url, created_at, has_unread_reply'

async function loadThreadMessages(threadId: string): Promise<FeedbackChatMessage[]> {
  const { data: rows, error: messageError } = await supabase
    .from('feedback_messages')
    .select('id, author_role, body, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  if (messageError) {
    throw new Error(FEEDBACK_HISTORY_LOAD_FAILED)
  }

  return (rows ?? [])
    .filter((row) => row.author_role === 'user' || row.author_role === 'system')
    .map((row) => ({
      id: row.id,
      role: row.author_role as 'user' | 'system',
      body: row.body,
      createdAt: row.created_at,
    }))
}

function toHistoryThread(
  thread: FeedbackThreadRow,
  messages: FeedbackChatMessage[],
): FeedbackHistoryThread {
  return {
    id: thread.id,
    title: thread.title,
    issueNumber: thread.github_issue_number,
    issueUrl: thread.github_issue_url,
    createdAt: thread.created_at,
    hasUnreadReply: thread.has_unread_reply,
    messages,
  }
}

/** 自分のご意見履歴（RLS）。未読返信があるスレッドを最新より優先して開く */
export async function loadLatestFeedbackThread(): Promise<FeedbackHistoryThread | null> {
  const { data: unreadRows, error: unreadError } = await supabase
    .from('feedback_threads')
    .select(THREAD_COLUMNS)
    .eq('has_unread_reply', true)
    .order('created_at', { ascending: false })
    .limit(20)

  if (unreadError) {
    throw new Error(FEEDBACK_HISTORY_LOAD_FAILED)
  }

  const { data: latestRows, error: latestError } = await supabase
    .from('feedback_threads')
    .select(THREAD_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(20)

  if (latestError) {
    throw new Error(FEEDBACK_HISTORY_LOAD_FAILED)
  }

  const byId = new Map<string, FeedbackThreadRow>()
  for (const row of [...(unreadRows ?? []), ...(latestRows ?? [])] as FeedbackThreadRow[]) {
    byId.set(row.id, row)
  }

  const picked = pickFeedbackThread(
    [...byId.values()].map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      hasUnreadReply: row.has_unread_reply,
    })),
  )
  if (!picked) return null

  const thread = byId.get(picked.id)
  if (!thread) return null

  return toHistoryThread(thread, await loadThreadMessages(thread.id))
}
