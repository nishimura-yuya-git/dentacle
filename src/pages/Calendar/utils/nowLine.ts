import {
  GRID_END_MINUTES,
  GRID_START_MINUTES,
  SLOT_HEIGHT_PX,
  SLOT_MINUTES,
} from './calendarGrid.ts'

function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** グリッド開始からの経過分を top(px) に変換（分未満は連続位置） */
export function minutesToGridTopPx(totalMinutes: number): number {
  return ((totalMinutes - GRID_START_MINUTES) / SLOT_MINUTES) * SLOT_HEIGHT_PX
}

/**
 * 表示日が今日かつ営業時間内なら現在時刻バーの top(px)。
 * それ以外は null（非表示）。
 */
export function resolveNowLineTopPx(
  viewDateISO: string,
  now: Date = new Date()
): number | null {
  if (viewDateISO !== toISODate(now)) return null

  const totalMinutes =
    now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60

  if (totalMinutes < GRID_START_MINUTES || totalMinutes >= GRID_END_MINUTES) {
    return null
  }

  return minutesToGridTopPx(totalMinutes)
}
