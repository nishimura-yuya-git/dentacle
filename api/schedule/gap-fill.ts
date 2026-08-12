import type { IncomingMessage, ServerResponse } from 'node:http'
import { runGapFillJob } from '../../server/schedule/runGapFillJob.ts'
import { toPublicProposeError } from '../../server/schedule/publicErrors.ts'

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
  clinicId?: string
  targetDate?: string
  vehicleTeamIds?: string[]
  teamId?: string
  windowStart?: string
  windowEnd?: string
  userMessage?: string
} {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return raw as {
    clinicId?: string
    targetDate?: string
    vehicleTeamIds?: string[]
    teamId?: string
    windowStart?: string
    windowEnd?: string
    userMessage?: string
  }
}

/**
 * POST /api/schedule/gap-fill
 * カレンダー「空きを埋める」→ Cursor SDK → 候補返却（仮予約はクライアント採用）
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
      error: toPublicProposeError('unauthorized', 'Authorization Bearer が必要です'),
    })
    return
  }

  const body = asBody(req.body)
  const clinicId = typeof body.clinicId === 'string' ? body.clinicId : ''
  const targetDate = typeof body.targetDate === 'string' ? body.targetDate : ''
  const teamId = typeof body.teamId === 'string' ? body.teamId : ''
  const windowStart =
    typeof body.windowStart === 'string' ? body.windowStart : ''
  const windowEnd = typeof body.windowEnd === 'string' ? body.windowEnd : ''
  const userMessage =
    typeof body.userMessage === 'string' ? body.userMessage : ''
  const vehicleTeamIds = Array.isArray(body.vehicleTeamIds)
    ? body.vehicleTeamIds.filter((id): id is string => typeof id === 'string')
    : []

  let outcome
  try {
    outcome = await runGapFillJob({
      accessToken,
      clinicId,
      targetDate,
      vehicleTeamIds,
      teamId,
      windowStart,
      windowEnd,
      userMessage,
    })
  } catch (err) {
    console.error(
      '[api/schedule/gap-fill]',
      err instanceof Error ? err.message : err,
    )
    res.status(500).json({
      ok: false,
      error: toPublicProposeError('internal', '空き枠埋めの処理に失敗しました'),
    })
    return
  }

  if (!outcome.ok) {
    const status =
      outcome.code === 'unauthorized'
        ? 401
        : outcome.code === 'forbidden'
          ? 403
          : outcome.code === 'bad_request'
            ? 400
            : outcome.code === 'rate_limited'
              ? 429
              : outcome.code === 'empty'
                ? 422
                : 500
    if (outcome.code === 'rate_limited' && outcome.retryAfterSec) {
      res.setHeader('Retry-After', String(outcome.retryAfterSec))
    }
    res.status(status).json(outcome)
    return
  }

  res.status(200).json(outcome)
}
