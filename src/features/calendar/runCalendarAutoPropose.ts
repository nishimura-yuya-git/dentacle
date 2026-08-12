import { supabase } from '@/lib/supabase'

export type CalendarAutoProposeResult = {
  jobId: string
  generatedCount: number
  adoptedCount: number
  runtime: 'local' | 'cloud'
  modelId: string
}

/**
 * カレンダー「自動提案」: サーバー Adapter → Cursor SDK → 仮予約。
 * 割付本体はフロントで再実装しない（§6.11）。
 */
export async function runCalendarAutoPropose(input: {
  clinicId: string
  targetDate: string
  vehicleTeamIds: string[]
}): Promise<CalendarAutoProposeResult> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError || !session?.access_token) {
    throw new Error(sessionError?.message || 'ログインセッションが必要です')
  }

  const response = await fetch('/api/schedule/propose', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      clinicId: input.clinicId,
      targetDate: input.targetDate,
      vehicleTeamIds: input.vehicleTeamIds,
    }),
  })

  const payload = (await response.json().catch(() => null)) as
    | {
        ok?: boolean
        error?: string
        jobId?: string
        generatedCount?: number
        adoptedCount?: number
        runtime?: 'local' | 'cloud'
        modelId?: string
      }
    | null

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || `自動提案に失敗しました（HTTP ${response.status}）`)
  }

  return {
    jobId: payload.jobId ?? '',
    generatedCount: payload.generatedCount ?? 0,
    adoptedCount: payload.adoptedCount ?? 0,
    runtime: payload.runtime ?? 'local',
    modelId: payload.modelId ?? '',
  }
}
