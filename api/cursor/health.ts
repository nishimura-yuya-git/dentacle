import type { IncomingMessage, ServerResponse } from 'node:http'
import { loadCursorServerEnv } from '../../server/cursor/env.ts'
import {
  buildPublicCursorHealthFail,
  buildPublicCursorHealthOk,
  CURSOR_HEALTH_GENERIC_ERROR,
  isCursorHealthAuthorized,
} from '../../server/cursor/healthGate.ts'

type VercelRequest = IncomingMessage & {
  method?: string
  query?: Record<string, string | string[] | undefined>
}

type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse
  json: (body: unknown) => void
}

/**
 * Cursor SDK 基盤のヘルスチェック。
 * - CURSOR_HEALTH_SECRET の Bearer 必須（未設定時は常に 401）
 * - 公開 JSON は ok / service / ready のみ（cwd・キー有無・環境変数名は出さない）
 * - 設定エラー詳細はサーバーログのみ
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'GET のみ対応しています' })
    return
  }

  if (!isCursorHealthAuthorized(req.headers.authorization)) {
    res.status(401).json({ ok: false, error: '認証が必要です' })
    return
  }

  try {
    loadCursorServerEnv()
    res.status(200).json(buildPublicCursorHealthOk())
  } catch (err) {
    console.error(
      '[api/cursor/health]',
      err instanceof Error ? err.message : err,
    )
    res.status(503).json(buildPublicCursorHealthFail(CURSOR_HEALTH_GENERIC_ERROR))
  }
}
