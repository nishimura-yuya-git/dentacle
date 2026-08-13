import type { IncomingMessage, ServerResponse } from 'node:http'
import { submitFeedbackWithEnv } from '../../server/feedback/submitFeedbackWithEnv.ts'
import { toPublicFeedbackError } from '../../server/feedback/publicErrors.ts'

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

function asBody(raw: unknown): {
  body?: string
  clinicId?: string
  pagePath?: string
  threadId?: string
} {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return raw as {
    body?: string
    clinicId?: string
    pagePath?: string
    threadId?: string
  }
}

/**
 * POST /api/feedback/send
 * ご意見チャット → GitHub Issue（続きはコメント）
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'POST のみ対応しています' })
    return
  }

  const accessToken = readBearer(req)
  if (!accessToken) {
    res.status(401).json({
      ok: false,
      error: toPublicFeedbackError('unauthorized', 'Authorization Bearer が必要です'),
    })
    return
  }

  const body = asBody(req.body)

  let outcome
  try {
    outcome = await submitFeedbackWithEnv({
      accessToken,
      body: typeof body.body === 'string' ? body.body : '',
      clinicId: typeof body.clinicId === 'string' ? body.clinicId : '',
      pagePath: typeof body.pagePath === 'string' ? body.pagePath : '',
      threadId: typeof body.threadId === 'string' ? body.threadId : '',
    })
  } catch (err) {
    console.error(
      '[api/feedback/send]',
      err instanceof Error ? err.message : err,
    )
    res.status(500).json({
      ok: false,
      error: toPublicFeedbackError('internal'),
    })
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
          : outcome.code === 'rate_limited'
            ? 429
            : outcome.code === 'not_configured'
              ? 503
              : 500

  if (!outcome.ok && outcome.code === 'rate_limited' && outcome.retryAfterSec) {
    res.setHeader('Retry-After', String(outcome.retryAfterSec))
  }

  res.status(status).json(outcome)
}
