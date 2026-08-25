/** 患者詳細から登録する確定済み訪問（正は visits.confirmed） */

export type PatientConfirmedVisitDraft = {
  date: string
  start: string
  end: string
  teamId: string
}

export type PatientConfirmedVisitRow = {
  id: string
  scheduledDate: string
  startTime: string
  endTime: string
  teamName: string
}

export function todayIsoDate(now = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function sliceTimeHm(value: string): string {
  return value.trim().slice(0, 5)
}

export function toVisitTimeHms(value: string): string {
  const hm = sliceTimeHm(value)
  if (!/^\d{2}:\d{2}$/.test(hm)) return value
  return `${hm}:00`
}

export function timeToMinutes(value: string): number {
  const [hours, minutes] = sliceTimeHm(value).split(':').map(Number)
  return hours * 60 + minutes
}

export function minutesToHm(total: number): string {
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function defaultConfirmedVisitTimes(input: {
  preferredStart?: string | null
  durationMinutes?: number | null
}): { start: string; end: string } {
  const start = sliceTimeHm(input.preferredStart ?? '') || '09:00'
  const duration =
    input.durationMinutes && input.durationMinutes > 0 ? input.durationMinutes : 30
  return {
    start,
    end: minutesToHm(timeToMinutes(start) + duration),
  }
}

export function validatePatientConfirmedVisitDraft(
  draft: PatientConfirmedVisitDraft,
): { ok: true } | { ok: false; message: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date.trim())) {
    return { ok: false, message: '日付を選んでください' }
  }
  if (!/^\d{2}:\d{2}$/.test(sliceTimeHm(draft.start))) {
    return { ok: false, message: '開始時刻を選んでください' }
  }
  if (!/^\d{2}:\d{2}$/.test(sliceTimeHm(draft.end))) {
    return { ok: false, message: '終了時刻を選んでください' }
  }
  if (timeToMinutes(draft.end) <= timeToMinutes(draft.start)) {
    return { ok: false, message: '終了は開始より後にしてください' }
  }
  if (!draft.teamId.trim()) {
    return { ok: false, message: '号車を選んでください' }
  }
  return { ok: true }
}

export function formatConfirmedVisitLine(row: PatientConfirmedVisitRow): string {
  const [year, month, day] = row.scheduledDate.split('-')
  const dateLabel = year && month && day ? `${year}/${month}/${day}` : row.scheduledDate
  return `${dateLabel} ${sliceTimeHm(row.startTime)}〜${sliceTimeHm(row.endTime)} · ${row.teamName}`
}
