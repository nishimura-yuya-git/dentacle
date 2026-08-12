/**
 * Cursor SDK 用サーバー環境変数。
 * VITE_ 接頭辞は付けない（フロントへ露出しない）。
 */

export type CursorRuntimeMode = 'local' | 'cloud'

export type CursorServerEnv = {
  apiKey: string
  runtime: CursorRuntimeMode
  modelId: string
  localCwd: string
  cloudRepoUrl: string | null
  cloudStartingRef: string
}

function parseRuntime(raw: string | undefined): CursorRuntimeMode {
  const value = (raw ?? 'local').toLowerCase()
  if (value === 'local' || value === 'cloud') return value
  throw new Error(
    `CURSOR_RUNTIME は local または cloud のみです（受領: ${raw ?? '(未設定)'}）`,
  )
}

/** サーバー専用 Cursor 設定を読む。不足時は Error */
export function loadCursorServerEnv(
  env: NodeJS.ProcessEnv = process.env,
): CursorServerEnv {
  const apiKey = env.CURSOR_API_KEY?.trim()
  if (!apiKey) {
    throw new Error(
      'CURSOR_API_KEY が未設定です（サーバー専用。.env.local に書いてください）',
    )
  }

  const runtime = parseRuntime(env.CURSOR_RUNTIME)
  // ベースは Grok 4.5（§6.14）。実 ID は Cursor.models.list() で確認して固定する
  const modelId = env.CURSOR_MODEL_ID?.trim() || 'grok-4.5'
  const localCwd = env.CURSOR_LOCAL_CWD?.trim() || process.cwd()
  const cloudRepoUrl = env.CURSOR_CLOUD_REPO_URL?.trim() || null
  const cloudStartingRef = env.CURSOR_CLOUD_STARTING_REF?.trim() || 'main'

  if (runtime === 'cloud' && !cloudRepoUrl) {
    throw new Error(
      'CURSOR_RUNTIME=cloud のときは CURSOR_CLOUD_REPO_URL が必須です（Private のあいだは local を使ってください）',
    )
  }

  return {
    apiKey,
    runtime,
    modelId,
    localCwd,
    cloudRepoUrl,
    cloudStartingRef,
  }
}

/** キー値を出さず、設定の有無だけ返す（health / ログ用） */
export function describeCursorEnv(config: CursorServerEnv): {
  runtime: CursorRuntimeMode
  modelId: string
  hasApiKey: true
  localCwd: string
  cloudRepoConfigured: boolean
  cloudStartingRef: string
} {
  return {
    runtime: config.runtime,
    modelId: config.modelId,
    hasApiKey: true,
    localCwd: config.localCwd,
    cloudRepoConfigured: Boolean(config.cloudRepoUrl),
    cloudStartingRef: config.cloudStartingRef,
  }
}
