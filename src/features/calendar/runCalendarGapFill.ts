import { CalendarGapFillError } from '@/features/calendar/calendarGapFillError'
import { supabase } from '@/lib/supabase'

export type GapFillCandidate = {
  patientId: string
  proposedStart: string
  proposedEnd: string
  teamIndex?: number
  reason: string
  warnings: string[]
}

export type CalendarGapFillResult = {
  candidates: GapFillCandidate[]
  runtime: 'local' | 'cloud'
  modelId: string
}

function readRetryAfterSec(
  response: Response,
  payload: { retryAfterSec?: unknown } | null,
): number | undefined {
  if (
    payload &&
    typeof payload.retryAfterSec === 'number' &&
    Number.isFinite(payload.retryAfterSec)
  ) {
    return Math.max(1, Math.ceil(payload.retryAfterSec))
  }
  const header = response.headers.get('Retry-After')
  if (!header) return undefined
  const sec = Number(header)
  return Number.isFinite(sec) && sec > 0 ? Math.ceil(sec) : undefined
}

/**
 * カレンダー「空きを埋める」: サーバー Adapter → Cursor SDK → 候補のみ返却。
 * 仮予約書き込みはクライアント採用時（§6.11 / §6.12）。
 */
export async function runCalendarGapFill(input: {
  clinicId: string
  targetDate: string
  vehicleTeamIds: string[]
  teamId: string
  windowStart: string
  windowEnd: string
  userMessage?: string
}): Promise<CalendarGapFillResult> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError || !session?.access_token) {
    throw new Error(sessionError?.message || 'ログインセッションが必要です')
  }

  const response = await fetch('/api/schedule/gap-fill', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      clinicId: input.clinicId,
      targetDate: input.targetDate,
      vehicleTeamIds: input.vehicleTeamIds,
      teamId: input.teamId,
      windowStart: input.windowStart,
      windowEnd: input.windowEnd,
      userMessage: input.userMessage ?? '',
    }),
  })

  const payload = (await response.json().catch(() => null)) as
    | {
        ok?: boolean
        error?: string
        code?: string
        retryAfterSec?: number
        candidates?: GapFillCandidate[]
        runtime?: 'local' | 'cloud'
        modelId?: string
      }
    | null

  if (!response.ok || !payload?.ok) {
    throw new CalendarGapFillError(
      payload?.error || `空き枠埋めに失敗しました（HTTP ${response.status}）`,
      {
        code: payload?.code,
        retryAfterSec: readRetryAfterSec(response, payload),
      },
    )
  }

  return {
    candidates: payload.candidates ?? [],
    runtime: payload.runtime ?? 'local',
    modelId: payload.modelId ?? '',
  }
}
