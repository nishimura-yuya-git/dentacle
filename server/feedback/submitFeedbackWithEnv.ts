import {
  GithubIssuesNotConfiguredError,
  createGithubIssuesApiFromEnv,
} from './githubIssues.ts'
import { toPublicFeedbackError } from './publicErrors.ts'
import { submitFeedback } from './submitFeedback.ts'
import { createSupabaseFeedbackStore } from './supabaseStore.ts'
import type { SubmitFeedbackInput, SubmitFeedbackResult } from './types.ts'

/** 本番 / Vite middleware 用。環境変数から GitHub と Supabase を接続する */
export async function submitFeedbackWithEnv(
  input: SubmitFeedbackInput,
  env: NodeJS.ProcessEnv = process.env,
): Promise<SubmitFeedbackResult> {
  let github
  try {
    github = createGithubIssuesApiFromEnv(env)
  } catch (err) {
    if (err instanceof GithubIssuesNotConfiguredError) {
      return {
        ok: false,
        code: 'not_configured',
        error: toPublicFeedbackError('not_configured'),
      }
    }
    throw err
  }

  return submitFeedback(input, {
    store: createSupabaseFeedbackStore(input.accessToken, env),
    github,
  })
}
