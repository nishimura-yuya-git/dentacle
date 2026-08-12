const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const

/** 一覧用: 2026年 6/8(月) */
export function formatListDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '—'
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  if (!matched) return isoDate
  const year = Number(matched[1])
  const month = Number(matched[2])
  const day = Number(matched[3])
  const date = new Date(year, month - 1, day)
  if (Number.isNaN(date.getTime())) return isoDate
  const weekday = WEEKDAYS[date.getDay()] ?? ''
  return `${year}年 ${month}/${day}(${weekday})`
}

/** 次回: 9/12(土) 10:30 */
export function formatNextVisit(
  isoDate: string | null | undefined,
  time: string | null | undefined,
): string {
  if (!isoDate) return '—'
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  if (!matched) return isoDate
  const year = Number(matched[1])
  const month = Number(matched[2])
  const day = Number(matched[3])
  const date = new Date(year, month - 1, day)
  if (Number.isNaN(date.getTime())) return isoDate
  const weekday = WEEKDAYS[date.getDay()] ?? ''
  const timePart = time ? ` ${time.slice(0, 5)}` : ''
  return `${month}/${day}(${weekday})${timePart}`
}

export function patientInitial(name: string): string {
  const trimmed = name.trim()
  return trimmed ? trimmed.slice(0, 1) : '患'
}
