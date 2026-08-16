import { supabase } from '@/lib/supabase'
import { FEEDBACK_MARK_READ_FAILED } from '@/features/feedback/feedbackSecurityContract'

/** 表示したスレッドの未読を落とす。本人以外は RPC が拒否する。 */
export async function markFeedbackThreadRead(threadId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_feedback_thread_read', {
    p_thread_id: threadId,
  })
  if (error) {
    throw new Error(FEEDBACK_MARK_READ_FAILED)
  }
}
