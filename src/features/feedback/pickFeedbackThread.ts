export type FeedbackThreadPickInput = {
  id: string
  createdAt: string
  hasUnreadReply: boolean
}

/**
 * 開くスレッドを決める。未読の返信があるスレッドを、新しい下書きより優先する。
 */
export function pickFeedbackThread<T extends FeedbackThreadPickInput>(
  threads: T[],
): T | null {
  if (threads.length === 0) return null

  const unread = threads.filter((thread) => thread.hasUnreadReply)
  const pool = unread.length > 0 ? unread : threads

  return [...pool].sort((left, right) => {
    if (left.createdAt === right.createdAt) return 0
    return left.createdAt > right.createdAt ? -1 : 1
  })[0] ?? null
}
