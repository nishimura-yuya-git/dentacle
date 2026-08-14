const PAGE_LABELS: Record<string, string> = {
  '/calendar': 'カレンダー',
  '/patients': '患者管理',
  '/contacts': '電話確認',
  '/users': 'ユーザー管理',
  '/settings': '設定',
  '/import': 'CSV取込',
  '/feedback': 'ご意見・不具合',
}

/** お知らせと同じ「2026年8月14日」。月日はゼロ埋めしない。 */
export function formatImprovementDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

/** 保存されたページパスを短い日本語にする。未知のパスは出さない。 */
export function formatImprovementPageLabel(pagePath: string | null | undefined): string | null {
  if (!pagePath) return null
  const path = pagePath.split('?')[0]?.split('#')[0] ?? ''
  return PAGE_LABELS[path] ?? null
}
