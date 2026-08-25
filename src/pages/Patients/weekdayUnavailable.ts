import { parseTimeHm } from '../../components/ui/timePickerUtils.ts'
import { WEEKDAY_LABELS } from '../../utils/roleLabels.ts'

export type WeekdayTimeKind = 'preferred' | 'unavailable'

export type WeekdayTimeWindow = {
  id: string | null
  clientId: string
  dayOfWeek: number
  kind: WeekdayTimeKind
  start: string
  end: string
  allDay?: boolean
}

export type ConstraintTimeRow = {
  id: string
  constraint_type: string
  day_of_week: number | null
  specific_date: string | null
  start_time: string | null
  end_time: string | null
}

export type WeekdayTimeSavePlan = {
  insert: WeekdayTimeWindow[]
  update: WeekdayTimeWindow[]
  deleteIds: string[]
}

let clientSeq = 0

export function createClientId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  clientSeq += 1
  return `wd-${clientSeq}`
}

export function createEmptyWindow(
  dayOfWeek: number,
  kind: WeekdayTimeKind,
  clientId = createClientId(),
): WeekdayTimeWindow {
  return {
    id: null,
    clientId,
    dayOfWeek,
    kind,
    start: '',
    end: '',
  }
}

export function constraintTypeFromKind(kind: WeekdayTimeKind): 'available' | 'unavailable' {
  return kind === 'preferred' ? 'available' : 'unavailable'
}

export function kindFromConstraintType(type: string): WeekdayTimeKind | null {
  if (type === 'available') return 'preferred'
  if (type === 'unavailable') return 'unavailable'
  return null
}

export function sliceTimeHm(value: string | null | undefined): string {
  return (value ?? '').slice(0, 5)
}

export function isValidTimeRange(start: string, end: string): boolean {
  const from = parseTimeHm(start)
  const to = parseTimeHm(end)
  if (!from || !to) return false
  return from.hour * 60 + from.minute < to.hour * 60 + to.minute
}

export function isWeekdayValue(day: number | null | undefined): day is number {
  return day != null && Number.isInteger(day) && day >= 0 && day <= 6
}

export function hasSpecificDate(row: ConstraintTimeRow): boolean {
  return Boolean(row.specific_date && String(row.specific_date).trim())
}

export function hasConstraintTimes(row: ConstraintTimeRow): boolean {
  return Boolean(sliceTimeHm(row.start_time) && sliceTimeHm(row.end_time))
}

export function isManagedWeekdayTimeRow(row: ConstraintTimeRow): boolean {
  const kind = kindFromConstraintType(row.constraint_type)
  return kind != null && isWeekdayValue(row.day_of_week) && !hasSpecificDate(row) && hasConstraintTimes(row)
}

export function isManagedAllDayUnavailable(row: ConstraintTimeRow): boolean {
  return (
    row.constraint_type === 'unavailable' &&
    isWeekdayValue(row.day_of_week) &&
    !hasSpecificDate(row) &&
    !hasConstraintTimes(row)
  )
}

export function isExceptionConstraintRow(row: ConstraintTimeRow): boolean {
  if (hasSpecificDate(row) || row.constraint_type === 'ng') return true
  return kindFromConstraintType(row.constraint_type) == null || !isWeekdayValue(row.day_of_week)
}

export function isAllDayUnavailable(row: WeekdayTimeWindow): boolean {
  return row.kind === 'unavailable' && row.allDay === true
}

export function dayHasAllDayUnavailable(windows: WeekdayTimeWindow[], day: number): boolean {
  return windows.some((row) => row.dayOfWeek === day && isAllDayUnavailable(row))
}

export function withAllDayUnavailable(
  windows: WeekdayTimeWindow[],
  day: number,
  enabled: boolean,
): WeekdayTimeWindow[] {
  const withoutAllDay = windows.filter((row) => !(row.dayOfWeek === day && isAllDayUnavailable(row)))
  if (!enabled) return withoutAllDay
  const kept = windows.find((row) => row.dayOfWeek === day && isAllDayUnavailable(row))
  if (kept) return windows
  return [
    ...withoutAllDay,
    { ...createEmptyWindow(day, 'unavailable', `all-day-${day}`), allDay: true },
  ]
}

export function weekdaysAfterAllDayChange(
  weekdays: number[],
  day: number,
  enabled: boolean,
): number[] {
  if (!enabled) return weekdays
  return weekdays.filter((item) => item !== day)
}

export function applyAllDayUnavailable(
  windows: WeekdayTimeWindow[],
  weekdays: number[],
  day: number,
  enabled: boolean,
): { windows: WeekdayTimeWindow[]; weekdays: number[] } {
  return {
    windows: withAllDayUnavailable(windows, day, enabled),
    weekdays: weekdaysAfterAllDayChange(weekdays, day, enabled),
  }
}

function toTimedWindow(row: ConstraintTimeRow): WeekdayTimeWindow {
  return {
    id: row.id,
    clientId: row.id,
    dayOfWeek: row.day_of_week as number,
    kind: kindFromConstraintType(row.constraint_type) as WeekdayTimeKind,
    start: sliceTimeHm(row.start_time),
    end: sliceTimeHm(row.end_time),
  }
}

function toAllDayWindow(row: ConstraintTimeRow): WeekdayTimeWindow {
  return {
    id: row.id,
    clientId: row.id,
    dayOfWeek: row.day_of_week as number,
    kind: 'unavailable',
    start: '',
    end: '',
    allDay: true,
  }
}

export function windowsFromConstraintRows(rows: ConstraintTimeRow[]): WeekdayTimeWindow[] {
  const timed = rows.filter(isManagedWeekdayTimeRow).map(toTimedWindow)
  const seenDays = new Set<number>()
  const allDay: WeekdayTimeWindow[] = []
  for (const row of rows.filter(isManagedAllDayUnavailable)) {
    const day = row.day_of_week as number
    if (seenDays.has(day)) continue
    seenDays.add(day)
    allDay.push(toAllDayWindow(row))
  }
  return [...timed, ...allDay]
}

export function leftoverAllDayUnavailableIds(
  rows: ConstraintTimeRow[],
  kept: WeekdayTimeWindow[],
): string[] {
  const keptIds = new Set(kept.filter((row) => row.allDay && row.id).map((row) => row.id as string))
  return rows.filter(isManagedAllDayUnavailable).filter((row) => !keptIds.has(row.id)).map((row) => row.id)
}

export function ensurePreferredDrafts(
  windows: WeekdayTimeWindow[],
  selectedDays: number[],
): WeekdayTimeWindow[] {
  const next = [...windows]
  for (const day of selectedDays) {
    if (dayHasAllDayUnavailable(next, day)) continue
    const hasPreferred = next.some((row) => row.dayOfWeek === day && row.kind === 'preferred' && !row.allDay)
    if (!hasPreferred) next.push(createEmptyWindow(day, 'preferred'))
  }
  return next
}

export function weekdayLabelOf(day: number): string {
  return WEEKDAY_LABELS[day] ?? `${day}`
}

export function validateWeekdayWindows(
  windows: WeekdayTimeWindow[],
): { ok: true } | { ok: false; message: string } {
  for (const row of windows) {
    if (isAllDayUnavailable(row)) continue
    const start = row.start.trim()
    const end = row.end.trim()
    if (!start && !end) continue
    const label = `${weekdayLabelOf(row.dayOfWeek)}曜の${row.kind === 'preferred' ? '希望時間' : 'いけない時間'}`
    if (!start || !end) {
      return { ok: false, message: `${label}は開始と終了の両方を入力してください` }
    }
    if (!isValidTimeRange(start, end)) {
      return { ok: false, message: `${label}は終了を開始より後にしてください` }
    }
  }
  return { ok: true }
}

export function persistableWindows(windows: WeekdayTimeWindow[]): WeekdayTimeWindow[] {
  return windows.filter((row) => !isAllDayUnavailable(row) && isValidTimeRange(row.start.trim(), row.end.trim()))
}

export function persistableAllDayWindows(windows: WeekdayTimeWindow[]): WeekdayTimeWindow[] {
  const seen = new Set<number>()
  const next: WeekdayTimeWindow[] = []
  for (const row of windows) {
    if (!isAllDayUnavailable(row) || seen.has(row.dayOfWeek)) continue
    seen.add(row.dayOfWeek)
    next.push(row)
  }
  return next
}

function sameWindow(left: WeekdayTimeWindow, right: WeekdayTimeWindow): boolean {
  return (
    left.dayOfWeek === right.dayOfWeek &&
    left.kind === right.kind &&
    Boolean(left.allDay) === Boolean(right.allDay) &&
    sliceTimeHm(left.start) === sliceTimeHm(right.start) &&
    sliceTimeHm(left.end) === sliceTimeHm(right.end)
  )
}

export function planWeekdayTimeSaves(
  existingManaged: WeekdayTimeWindow[],
  draft: WeekdayTimeWindow[],
): WeekdayTimeSavePlan {
  const allDayDays = new Set(persistableAllDayWindows(draft).map((row) => row.dayOfWeek))
  const next = [
    ...persistableWindows(draft.filter((row) => !allDayDays.has(row.dayOfWeek))),
    ...persistableAllDayWindows(draft),
  ]
  const existingIds = new Set(
    existingManaged.map((row) => row.id).filter((id): id is string => Boolean(id)),
  )
  const keptIds = new Set(next.map((row) => row.id).filter((id): id is string => Boolean(id)))

  return {
    insert: next.filter((row) => !row.id),
    update: next.filter((row) => {
      if (!row.id || !existingIds.has(row.id)) return false
      const before = existingManaged.find((item) => item.id === row.id)
      return !before || !sameWindow(before, row)
    }),
    deleteIds: [...existingIds].filter((id) => !keptIds.has(id)),
  }
}
