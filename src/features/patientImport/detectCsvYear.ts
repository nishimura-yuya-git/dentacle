/** 全角数字を半角へ（令和 ８年 など） */
function toHalfWidthDigits(value: string): string {
  return value.replace(/[０-９]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xff10 + 0x30)
  )
}

/**
 * CSV先頭付近の期間行から、最終日付解釈用の西暦年を推定する。
 * 例: 「令和  ８年  ４月…」→ 2026（令和1年=2019）
 */
export function detectCsvDefaultYear(text: string): number | null {
  const head = text.slice(0, 800)
  const reiwa = head.match(/令和\s*([0-9０-９]+)\s*年/)
  if (reiwa?.[1]) {
    const n = Number(toHalfWidthDigits(reiwa[1]))
    if (Number.isInteger(n) && n >= 1 && n <= 100) {
      return 2018 + n
    }
  }

  const western = head.match(/(20\d{2})\s*年/)
  if (western?.[1]) {
    const year = Number(western[1])
    if (year >= 2000 && year <= 2100) return year
  }

  return null
}
