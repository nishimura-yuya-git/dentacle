/**
 * Cursor SDK 基盤の疎通確認。
 *
 * 既定: 設定検証のみ（APIキー有無・runtime・cloud URL 要件）
 * 実エージェント起動: --run （CURSOR_API_KEY 必須・課金発生の可能性あり）
 *
 * Cloud smoke は Private のあいだスキップ（CURSOR_RUNTIME=cloud かつ repo 未設定なら失敗）
 */
import {
  describeCursorEnv,
  loadCursorServerEnv,
} from '../server/cursor/env.ts'
import { buildCursorRuntimeOptions } from '../server/cursor/runtime.ts'
import { runCursorAgentPrompt } from '../server/cursor/runAgent.ts'

const wantRun = process.argv.includes('--run')

try {
  const config = loadCursorServerEnv()
  const runtime = buildCursorRuntimeOptions(config)
  const described = describeCursorEnv(config)

  console.log('[cursor:smoke] 設定OK')
  console.log(JSON.stringify({ ...described, runtimeKind: 'local' in runtime ? 'local' : 'cloud' }, null, 2))

  if (config.runtime === 'cloud') {
    console.log(
      '[cursor:smoke] cloud が選択されています。Private のあいだは CURSOR_RUNTIME=local を推奨します。',
    )
  }

  if (!wantRun) {
    console.log('[cursor:smoke] 実エージェントは起動していません（--run で実行）')
    process.exit(0)
  }

  const outcome = await runCursorAgentPrompt({
    prompt:
      'Reply with exactly: dentacle-cursor-sdk-ok. No other text.',
    env: config,
  })

  if (!outcome.ok) {
    console.error(`[cursor:smoke] ${outcome.kind} failure: ${outcome.message}`)
    process.exit(outcome.kind === 'startup' ? 1 : 2)
  }

  console.log('[cursor:smoke] 実行OK', {
    durationMs: outcome.durationMs,
    resultText: outcome.resultText,
  })
  process.exit(0)
} catch (err) {
  console.error(
    '[cursor:smoke] 失敗:',
    err instanceof Error ? err.message : err,
  )
  process.exit(1)
}
