export type AuthAuditEvent = 'login_success' | 'login_failure' | 'logout' | string

const EVENT_LABELS: Record<string, string> = {
  login_success: 'ログイン成功',
  login_failure: 'ログイン失敗',
  logout: 'ログアウト',
}

export function formatAuthAuditEventLabel(event: AuthAuditEvent): string {
  return EVENT_LABELS[event] ?? 'その他'
}

export function formatAuthAuditCreatedAt(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  const ss = String(date.getSeconds()).padStart(2, '0')
  return `${y}/${m}/${d} ${hh}:${mm}:${ss}`
}

export function formatAuthAuditUserAgent(userAgent: string | null): string {
  if (!userAgent?.trim()) return '—'
  const trimmed = userAgent.trim()
  if (trimmed.length <= 72) return trimmed
  return `${trimmed.slice(0, 72)}…`
}

/** User-Agent から運用向けの短い端末ラベルを作る（機種名・個体識別は不可） */
export function formatAuthAuditDeviceLabel(userAgent: string | null): string {
  if (!userAgent?.trim()) return '—'
  const ua = userAgent.trim()

  let os = '不明OS'
  if (/iPhone/i.test(ua)) os = 'iPhone'
  else if (/iPad/i.test(ua)) os = 'iPad'
  else if (/Android/i.test(ua)) os = 'Android'
  else if (/Windows NT/i.test(ua)) os = 'Windows'
  else if (/Mac OS X|Macintosh/i.test(ua)) os = 'Mac'
  else if (/CrOS/i.test(ua)) os = 'ChromeOS'
  else if (/Linux/i.test(ua)) os = 'Linux'

  let browser = '不明ブラウザ'
  if (/Edg\//i.test(ua)) browser = 'Edge'
  else if (/OPR\/|Opera/i.test(ua)) browser = 'Opera'
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = 'Chrome'
  else if (/Firefox\//i.test(ua)) browser = 'Firefox'
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Safari'

  let device = 'パソコン'
  if (/Mobile|iPhone|Android.+Mobile/i.test(ua) && !/iPad/i.test(ua)) device = 'スマホ'
  else if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) device = 'タブレット'

  return `${device} · ${os} · ${browser}`
}
