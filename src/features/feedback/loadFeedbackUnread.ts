import { supabase } from '@/lib/supabase'
import { FEEDBACK_UNREAD_LOAD_FAILED } from '@/features/feedback/feedbackSecurityContract'

/** 本人の未読返信があるか。件数は返さない。 */
export async function loadHasUnreadFeedbackReply(): Promise<boolean> {
  const { data, error } = await supabase
    .from('feedback_threads')
    .select('id')
    .eq('has_unread_reply', true)
    .limit(1)

  if (error) {
    throw new Error(FEEDBACK_UNREAD_LOAD_FAILED)
  }

  return (data?.length ?? 0) > 0
}
