import { WEEKDAY_LABELS } from '../../../utils/roleLabels.ts'
import {
  formatReservationDateTime,
  type PatientVisitReservation,
} from './visitReservationRows.ts'

export const CONSTRAINT_TYPE_LABEL: Record<string, string> = {
  ng: 'NG',
  unavailable: '不可',
  available: '可',
}

export type BriefingConstraint = {
  constraint_type: string
  day_of_week: number | null
  specific_date: string | null
  note: string | null
  start_time?: string | null
  end_time?: string | null
}

export function formatBriefingText(value: string | null | undefined, empty: string): string {
  const trimmed = value?.trim() ?? ''
  return trimmed || empty
}

export function formatPreferredWeekdays(weekdays: number[] | null | undefined): string {
  const labels = (weekdays ?? [])
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    .map((day) => WEEKDAY_LABELS[day])
  return labels.length > 0 ? labels.join('・') : '希望曜日の登録なし'
}

export function formatPreferredTimeRange(
  start: string | null | undefined,
  end: string | null | undefined,
): string | null {
  const from = start?.slice(0, 5) ?? ''
  const to = end?.slice(0, 5) ?? ''
  if (!from && !to) return null
  if (from && to) return `${from}〜${to}`
  return from || to
}

export function formatConstraintLine(row: BriefingConstraint): string {
  const typeLabel = CONSTRAINT_TYPE_LABEL[row.constraint_type] ?? row.constraint_type
  const weekday =
    row.day_of_week != null && row.day_of_week >= 0 && row.day_of_week <= 6
      ? `${WEEKDAY_LABELS[row.day_of_week]}曜`
      : null
  const date = row.specific_date ? row.specific_date.replace(/-/g, '/') : null
  const when = [weekday, date].filter(Boolean).join(' ')
  const time = formatPreferredTimeRange(row.start_time, row.end_time)
  const note = row.note?.trim() || ''
  return [typeLabel, when, time, note].filter(Boolean).join(' / ')
}

export function formatPreferredHopeParts(
  weekdays: number[] | null | undefined,
  constraints: BriefingConstraint[],
  fallbackStart: string | null | undefined,
  fallbackEnd: string | null | undefined,
): { weekdayLabel: string; timeRangeLabel: string | null } {
  const days = (weekdays ?? []).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
  const weekdayLabel = formatPreferredWeekdays(days)
  const fallback = formatPreferredTimeRange(fallbackStart, fallbackEnd)
  const perDay = days.map((day) => {
    const ranges = constraints
      .filter(
        (row) =>
          row.constraint_type === 'available' &&
          row.day_of_week === day &&
          formatPreferredTimeRange(row.start_time, row.end_time),
      )
      .map((row) => formatPreferredTimeRange(row.start_time, row.end_time) as string)
    return { day, ranges }
  })
  if (!perDay.some((item) => item.ranges.length > 0)) {
    return { weekdayLabel, timeRangeLabel: fallback }
  }
  return {
    weekdayLabel: perDay
      .map((item) => {
        const name = WEEKDAY_LABELS[item.day]
        if (item.ranges.length > 0) return `${name} ${item.ranges.join('・')}`
        if (fallback) return `${name} ${fallback}`
        return name
      })
      .join('・'),
    timeRangeLabel: null,
  }
}

export function formatPreviousVisitLabel(
  previous: PatientVisitReservation | null,
  lastVisitDate: string | null | undefined,
): string {
  if (previous) {
    return `${formatReservationDateTime(
      previous.scheduled_date,
      previous.start_time,
      previous.end_time,
    )} ${previous.staffName} ${previous.menuText}`
  }
  const fallback = lastVisitDate?.trim()
  if (fallback) {
    const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fallback)
    if (!matched) return `${fallback}（条件の前回日）`
    return `${Number(matched[1])}/${Number(matched[2])}/${Number(matched[3])}（条件の前回日）`
  }
  return '前回の訪問はまだありません'
}
