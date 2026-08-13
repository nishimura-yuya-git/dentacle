/**
 * ご意見チャット API のクライアント向けエラー文言。
 * GitHub / Postgres の生メッセージは載せない（詳細はサーバーログのみ）。
 */

export const PUBLIC_FEEDBACK_ERROR = {
  unauthorized: '認証に失敗しました',
  forbidden: 'このクリニックへのご意見送信はできません',
  bad_request: 'リクエストの内容が正しくありません',
  rate_limited: '連続送信はできません。しばらくしてからお試しください。',
  not_configured: 'Issue連携がまだ設定されていません。運営に連絡してください。',
  internal: 'ご意見の受付に失敗しました',
} as const

export type PublicFeedbackErrorCode = keyof typeof PUBLIC_FEEDBACK_ERROR

export function toPublicFeedbackError(
  code: PublicFeedbackErrorCode,
  override?: string,
): string {
  if (override?.trim()) return override
  return PUBLIC_FEEDBACK_ERROR[code]
}

export function formatFeedbackWaitLabel(retryAfterSec: number): string {
  const sec = Math.max(1, Math.ceil(retryAfterSec))
  if (sec >= 60) {
    const minutes = Math.ceil(sec / 60)
    return minutes === 1 ? '1分後' : `約${minutes}分後`
  }
  return `${sec}秒後`
}

export function toRateLimitedFeedbackError(retryAfterSec: number): string {
  const wait = formatFeedbackWaitLabel(retryAfterSec)
  return `連続送信はできません。${wait}までお待ちください。`
}
