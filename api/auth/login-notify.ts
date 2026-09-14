import type { IncomingMessage, ServerResponse } from 'node:http'
import { notifyLoginSuccess } from '../../server/auth/notifyLogin.ts'

type VercelRequest = IncomingMessage & {
  method?: string
  body?: unknown
  headers: IncomingMessage['headers']
}

type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse
  json: (body: unknown) => void
}

function readBearer(req: VercelRequest): string | null {
  const header = req.headers.authorization
  if (!header || typeof header !== 'string') return null
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  return match?.[1]?.trim() || null
}

function asBody(raw: unknown): { auditId?: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return raw as { auditId?: string }
}

/**
 * POST /api/auth/login-notify
 * ログイン成功の運営メール。監査IDを本人JWTで確認してから送る。
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'POST のみ対応しています' })
    return
  }

  const accessToken = readBearer(req)
  if (!accessToken) {
    res.status(401).json({ ok: false, error: 'ログインが必要です' })
    return
  }

  const body = asBody(req.body)
  let outcome
  try {
    outcome = await notifyLoginSuccess({
      accessToken,
      auditId: typeof body.auditId === 'string' ? body.auditId : '',
    })
  } catch (err) {
    console.error('[api/auth/login-notify]', err instanceof Error ? err.message : err)
    res.status(500).json({ ok: false, error: 'ログイン通知に失敗しました' })
    return
  }

  const status = outcome.ok
    ? 200
    : outcome.code === 'unauthorized'
      ? 401
      : outcome.code === 'forbidden'
        ? 403
        : outcome.code === 'bad_request'
          ? 400
          : outcome.code === 'not_configured'
            ? 503
            : 500

  res.status(status).json(outcome)
}
