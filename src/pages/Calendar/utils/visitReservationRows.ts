import { WEEKDAY_LABELS } from '../../../utils/roleLabels.ts'
import {
  readVisitMenus,
  type VisitMenuSnapshot,
} from '../../../utils/visitMenus/visitMenuState.ts'
import type { Json } from '../../../types/database.types.ts'

export type PatientVisitReservation = {
  id: string
  scheduled_date: string
  start_time: string
  end_time: string
  status: string
  staffName: string
  menuText: string
}

export function durationMinutesLabel(start: string, end: string): string {
  const [startHour, startMinute] = start.slice(0, 5).split(':').map(Number)
  const [endHour, endMinute] = end.slice(0, 5).split(':').map(Number)
  const minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute)
  if (!Number.isFinite(minutes) || minutes <= 0) return '—'
  return `${minutes}分`
}

export function formatReservationDateTime(
  isoDate: string,
  start: string,
  end: string,
): string {
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  const startHm = start.slice(0, 5)
  const duration = durationMinutesLabel(start, end)
  if (!matched) return `${isoDate} ${startHm}（${duration}）`
  const year = Number(matched[1])
  const month = Number(matched[2])
  const day = Number(matched[3])
  const weekday = WEEKDAY_LABELS[new Date(year, month - 1, day).getDay()] ?? ''
  return `${year}/${month}/${day}(${weekday}) ${startHm}（${duration}）`
}

export function reservationMenuText(menus: VisitMenuSnapshot[]): string {
  const names = menus.map((menu) => menu.name_snapshot).filter(Boolean)
  return names.length > 0 ? names.join(' / ') : '指定なし'
}

export function canCancelReservation(status: string): boolean {
  return status === 'tentative' || status === 'confirmed'
}

export function staffNameFromJoin(value: unknown): string {
  if (Array.isArray(value)) return staffNameFromJoin(value[0])
  if (value && typeof value === 'object' && 'display_name' in value) {
    const name = (value as { display_name?: unknown }).display_name
    return typeof name === 'string' && name.trim() ? name : '—'
  }
  return '—'
}

export function toPatientVisitReservation(row: {
  id: string
  scheduled_date: string
  start_time: string
  end_time: string
  status: string
  metadata?: Json | null
  staff_members?: unknown
}): PatientVisitReservation {
  return {
    id: row.id,
    scheduled_date: row.scheduled_date,
    start_time: row.start_time,
    end_time: row.end_time,
    status: row.status,
    staffName: staffNameFromJoin(row.staff_members),
    menuText: reservationMenuText(readVisitMenus(row.metadata)),
  }
}

export function ensureCurrentReservation(
  rows: PatientVisitReservation[],
  current: PatientVisitReservation,
): PatientVisitReservation[] {
  if (rows.some((row) => row.id === current.id)) return rows
  return [current, ...rows]
}

function reservationSortKey(row: Pick<PatientVisitReservation, 'scheduled_date' | 'start_time'>): string {
  return `${row.scheduled_date}T${row.start_time.slice(0, 5)}`
}

/** 開いている予約より前の、取消以外の最新1件 */
export function pickPreviousReservation(
  rows: PatientVisitReservation[],
  current: Pick<PatientVisitReservation, 'id' | 'scheduled_date' | 'start_time'>,
): PatientVisitReservation | null {
  const currentKey = reservationSortKey(current)
  const previous = rows.filter(
    (row) =>
      row.id !== current.id &&
      row.status !== 'cancelled' &&
      reservationSortKey(row) < currentKey,
  )
  previous.sort((left, right) => reservationSortKey(right).localeCompare(reservationSortKey(left)))
  return previous[0] ?? null
}
