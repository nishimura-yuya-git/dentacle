import { createUserSupabaseClient } from '../schedule/createUserClient.ts'
import type {
  FeedbackStore,
  FeedbackThreadRecord,
  FeedbackUser,
} from './types.ts'

function asIso(value: Date): string {
  return value.toISOString()
}

/** JWT 付き RLS クライアントでご意見スレッドを読み書きする */
export function createSupabaseFeedbackStore(
  accessToken: string,
  env: NodeJS.ProcessEnv = process.env,
): FeedbackStore {
  const supabase = createUserSupabaseClient(accessToken, env)

  return {
    async getUser(): Promise<FeedbackUser | null> {
      const { data, error } = await supabase.auth.getUser(accessToken)
      if (error || !data.user) return null
      return {
        id: data.user.id,
        email: data.user.email ?? null,
      }
    },

    async canSend(userId, clinicId) {
      const { data: platformAdmin } = await supabase
        .from('platform_admins')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle()
      if (platformAdmin) return true
      if (!clinicId) return false

      const { data: membership, error } = await supabase
        .from('clinic_members')
        .select('id')
        .eq('clinic_id', clinicId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .is('deleted_at', null)
        .maybeSingle()
      if (error) {
        console.error('[feedback:store] membership', error.message)
        return false
      }
      return Boolean(membership)
    },

    async getClinicName(clinicId) {
      const { data, error } = await supabase
        .from('clinics')
        .select('name')
        .eq('id', clinicId)
        .maybeSingle()
      if (error) {
        console.error('[feedback:store] clinic', error.message)
        return null
      }
      return data?.name ?? null
    },

    async getThread(threadId, userId): Promise<FeedbackThreadRecord | null> {
      const { data, error } = await supabase
        .from('feedback_threads')
        .select(
          'id, user_id, clinic_id, github_issue_number, github_issue_url, title, page_path',
        )
        .eq('id', threadId)
        .eq('user_id', userId)
        .maybeSingle()
      if (error) {
        console.error('[feedback:store] thread', error.message)
        return null
      }
      if (!data) return null
      return {
        id: data.id,
        userId: data.user_id,
        clinicId: data.clinic_id,
        githubIssueNumber: data.github_issue_number,
        githubIssueUrl: data.github_issue_url,
        title: data.title,
        pagePath: data.page_path ?? '/',
      }
    },

    async insertThread(input) {
      const { error } = await supabase.from('feedback_threads').insert({
        id: input.id,
        user_id: input.userId,
        clinic_id: input.clinicId,
        github_issue_number: input.githubIssueNumber,
        github_issue_url: input.githubIssueUrl,
        title: input.title,
        page_path: input.pagePath,
      })
      if (error) throw new Error(error.message)
    },

    async insertMessage(input) {
      const { error } = await supabase.from('feedback_messages').insert({
        id: input.id,
        thread_id: input.threadId,
        user_id: input.userId,
        author_role: input.authorRole,
        body: input.body,
        created_at: input.createdAt || asIso(new Date()),
      })
      if (error) throw new Error(error.message)
    },

    async createImprovementItem(threadId) {
      const { error } = await supabase.rpc('create_improvement_item_for_thread', {
        p_thread_id: threadId,
      })
      if (error) throw new Error(error.message)
    },
  }
}
