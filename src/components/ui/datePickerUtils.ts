/** 日付ピッカー用の純粋関数（YYYY-MM-DD） */

export const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const

export type MonthCell = {
  iso: string
  day: number
  inMonth: boolean
}

export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseISODate(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return null
  }
  return date
}

export function formatDateSlash(iso: string): string {
  const date = parseISODate(iso)
  if (!date) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}/${m}/${d}`
}

export function formatMonthTitle(year: number, monthIndex: number): string {
  return `${year}年${monthIndex + 1}月`
}

export function shiftMonth(year: number, monthIndex: number, delta: number): {
  year: number
  monthIndex: number
} {
  const date = new Date(year, monthIndex + delta, 1)
  return { year: date.getFullYear(), monthIndex: date.getMonth() }
}

/** 日曜始まりの月グリッド（前後月の埋めを含む） */
export function buildMonthCells(year: number, monthIndex: number): MonthCell[] {
  const first = new Date(year, monthIndex, 1)
  const startPad = first.getDay()
  const gridStart = new Date(year, monthIndex, 1 - startPad)
  const cells: MonthCell[] = []

  for (let i = 0; i < 42; i += 1) {
    const date = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + i
    )
    cells.push({
      iso: toISODate(date),
      day: date.getDate(),
      inMonth: date.getMonth() === monthIndex,
    })
  }

  return cells
}
