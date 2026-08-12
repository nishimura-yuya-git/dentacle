/** 日別グリッドの時間軸（15分刻み） */
export const GRID_START_MINUTES = 9 * 60
export const GRID_END_MINUTES = 18 * 60
export const SLOT_MINUTES = 15
export const SLOT_HEIGHT_PX = 28
export const TIME_GUTTER_PX = 56
export const COLUMN_WIDTH_PX = 160

export function timeToMinutes(value: string): number {
  const [h, m] = value.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}

export function minutesToLabel(total: number): string {
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function buildTimeSlots(): number[] {
  const slots: number[] = []
  for (let t = GRID_START_MINUTES; t < GRID_END_MINUTES; t += SLOT_MINUTES) {
    slots.push(t)
  }
  return slots
}

export function visitBlockStyle(startTime: string, endTime: string): {
  top: number
  height: number
} {
  const start = Math.max(timeToMinutes(startTime), GRID_START_MINUTES)
  const end = Math.min(timeToMinutes(endTime), GRID_END_MINUTES)
  const top = ((start - GRID_START_MINUTES) / SLOT_MINUTES) * SLOT_HEIGHT_PX
  const height = Math.max(
    SLOT_HEIGHT_PX,
    ((end - start) / SLOT_MINUTES) * SLOT_HEIGHT_PX - 2
  )
  return { top, height }
}

export function gridBodyHeightPx(): number {
  return ((GRID_END_MINUTES - GRID_START_MINUTES) / SLOT_MINUTES) * SLOT_HEIGHT_PX
}

export function shiftDateISO(iso: string, deltaDays: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + deltaDays)
  const yy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const

export function formatJapaneseDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `${y}年${m}月${d}日 (${WEEKDAYS[date.getDay()]})`
}
