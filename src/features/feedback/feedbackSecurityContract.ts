/**
 * ご意見チャットで画面に出してよい文言。
 * Auth / GitHub / Postgres の生メッセージは許可リストに入れない。
 */

export const FEEDBACK_CLIENT_FALLBACK = 'ご意見の送信に失敗しました'

export const FEEDBACK_SESSION_REQUIRED = 'ログインセッションが必要です'

export const FEEDBACK_HISTORY_LOAD_FAILED = 'ご意見の履歴を読み込めませんでした'

export const FEEDBACK_UNREAD_LOAD_FAILED = 'ご意見の未読を確認できませんでした'

export const FEEDBACK_MARK_READ_FAILED = 'ご意見の既読を更新できませんでした'

export const FEEDBACK_PUBLIC_ERROR_MESSAGES = [
  '認証に失敗しました',
  'このクリニックへのご意見送信はできません',
  'リクエストの内容が正しくありません',
  '連続送信はできません。しばらくしてからお試しください。',
  'ご意見の受付準備がまだ完了していません。運営に連絡してください。',
  'ご意見の受付に失敗しました',
  FEEDBACK_CLIENT_FALLBACK,
  '本文を入力してください',
  '本文は4000文字以内にしてください',
  '対象のご意見が見つかりません',
  FEEDBACK_SESSION_REQUIRED,
  'Authorization Bearer が必要です',
  'POST のみ対応しています',
] as const

const RATE_LIMIT_MESSAGE =
  /^連続送信はできません。(?:\d+秒後|1分後|約\d+分後)までお待ちください。$/

const HTTP_FALLBACK_MESSAGE = /^ご意見の送信に失敗しました（HTTP \d+\）$/

export function isAllowlistedPublicFeedbackMessage(message: string): boolean {
  if ((FEEDBACK_PUBLIC_ERROR_MESSAGES as readonly string[]).includes(message)) return true
  if (RATE_LIMIT_MESSAGE.test(message)) return true
  return HTTP_FALLBACK_MESSAGE.test(message)
}

/** API / Auth の生文言をチャット赤字に出さない。 */
export function toClientFeedbackError(
  payloadError: string | undefined,
  httpStatus?: number,
): string {
  const value = (payloadError ?? '').trim()
  if (value && isAllowlistedPublicFeedbackMessage(value)) return value
  if (!value && httpStatus != null) {
    return `ご意見の送信に失敗しました（HTTP ${httpStatus}）`
  }
  return FEEDBACK_CLIENT_FALLBACK
}
