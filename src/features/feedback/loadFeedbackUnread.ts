import { supabase } from '@/lib/supabase'

/** 本人の未読返信があるか。件数は返さない。 */
export async function loadHasUnreadFeedbackReply(): Promise<boolean> {
  const { data, error } = await supabase
    .from('feedback_threads')
    .select('id')
    .eq('has_unread_reply', true)
    .limit(1)

  if (error) {
    throw new Error(error.message)
  }

  return (data?.length ?? 0) > 0
}
