import type { IncomingMessage, ServerResponse } from 'node:http'
import { invitePlatformAdmin } from '../../server/admins/invitePlatformAdmin.ts'
import { toPublicAdminInviteError } from '../../server/admins/publicErrors.ts'

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

function asBody(raw: unknown): { email?: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return raw as { email?: string }
}

function readOrigin(req: VercelRequest): string | undefined {
  const origin = req.headers.origin
  if (typeof origin === 'string' && origin.trim()) return origin
  const referer = req.headers.referer
  if (typeof referer !== 'string') return undefined
  try {
    return new URL(referer).origin
  } catch {
    return undefined
  }
}

/**
 * POST /api/admins/invite
 * 運営招待。Supabase Auth がメールを送り、リンク先でパスワードを設定する。
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
      error: toPublicAdminInviteError('unauthorized'),
    })
    return
  }

  const body = asBody(req.body)
  let outcome
  try {
    outcome = await invitePlatformAdmin({
      accessToken,
      email: typeof body.email === 'string' ? body.email : '',
      origin: readOrigin(req),
    })
  } catch (err) {
    console.error('[api/admins/invite]', err instanceof Error ? err.message : err)
    res.status(500).json({
      ok: false,
      error: toPublicAdminInviteError('internal'),
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

  res.status(status).json(outcome)
}
