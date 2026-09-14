import { APP_DISPLAY_NAME } from '../../src/config/appName.ts'
import { formatAuthAuditDeviceLabel } from '../../src/pages/AuthAudit/formatAuthAudit.ts'
import {
  formatAuthAuditMembershipsLabel,
  parseAuthAuditMemberships,
} from '../../src/pages/AuthAudit/authAuditMemberships.ts'

/** ログイン成功通知の既定宛先（§6.22 の運営メール） */
export const DEFAULT_LOGIN_NOTIFY_TO = 'y.nishimura@leanstack.co.jp'

export type LoginNotifyEmailInput = {
  displayName: string | null
  email: string | null
  createdAt: string
  ip: string | null
  userAgent: string | null
  metadata: unknown
}

function pickLabel(displayName: string | null, email: string | null): string {
  const name = displayName?.trim()
  if (name) return name
  const mail = email?.trim()
  if (mail) return mail
  return '（名前なし）'
}

/** 監査時刻を日本時間の `YYYY/MM/DD HH:mm:ss` にする */
export function formatLoginNotifyDateTime(
  iso: string,
  timeZone = 'Asia/Tokyo',
): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''
  return `${get('year')}/${get('month')}/${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`
}

export function resolveLoginNotifyTo(env: NodeJS.ProcessEnv = process.env): string {
  const fromEnv = env.LOGIN_NOTIFY_TO?.trim()
  return fromEnv || DEFAULT_LOGIN_NOTIFY_TO
}

export function buildLoginNotifyEmail(input: LoginNotifyEmailInput): {
  subject: string
  text: string
} {
  const label = pickLabel(input.displayName, input.email)
  const memberships = formatAuthAuditMembershipsLabel(
    parseAuthAuditMemberships(input.metadata),
  )
  const lines = [
    `${APP_DISPLAY_NAME} にログインがありました。`,
    '',
    `日時: ${formatLoginNotifyDateTime(input.createdAt)}（日本時間）`,
    `メール: ${input.email?.trim() || '—'}`,
    `表示名: ${input.displayName?.trim() || '—'}`,
    `IP: ${input.ip?.trim() || '—'}`,
    `端末: ${formatAuthAuditDeviceLabel(input.userAgent)}`,
    `所属: ${memberships}`,
  ]

  return {
    subject: `【${APP_DISPLAY_NAME}】ログイン: ${label}`,
    text: `${lines.join('\n')}\n`,
  }
}
