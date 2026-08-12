import type { CursorServerEnv } from './env.ts'

/** Agent.create / Agent.prompt に渡す runtime オプション */
export type CursorAgentRuntimeOptions =
  | { local: { cwd: string; settingSources?: [] } }
  | {
      cloud: {
        repos: Array<{ url: string; startingRef: string }>
        autoCreatePR?: boolean
        skipReviewerRequest?: boolean
      }
    }

/**
 * MEMORY §6.10: 本番 cloud は cloud を明示。未指定で local に黙って落とさない。
 * 当面 Private リポジトリのため既定は local。
 */
export function buildCursorRuntimeOptions(
  config: CursorServerEnv,
): CursorAgentRuntimeOptions {
  if (config.runtime === 'local') {
    return {
      local: {
        cwd: config.localCwd,
        // サービス実行では ambient 設定を読まない
        settingSources: [],
      },
    }
  }

  if (!config.cloudRepoUrl) {
    throw new Error('cloud 実行には CURSOR_CLOUD_REPO_URL が必要です')
  }

  return {
    cloud: {
      repos: [
        {
          url: config.cloudRepoUrl,
          startingRef: config.cloudStartingRef,
        },
      ],
      // 製品ジョブは PR 自動作成しない（結果はアプリ側 Adapter で受け取る）
      autoCreatePR: false,
      skipReviewerRequest: true,
    },
  }
}
