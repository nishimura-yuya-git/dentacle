/**
 * 自動提案 API のクライアント向けエラー文言。
 * Postgres / SDK の生メッセージは載せない（詳細はサーバーログのみ）。
 */

export const PUBLIC_PROPOSE_ERROR = {
  unauthorized: '認証に失敗しました',
  forbidden: '提案の実行はオーナー / 管理者 / コーディネーターのみ可能です',
  bad_request: 'リクエストの内容が正しくありません',
  empty: '割付対象の提案を作成できませんでした',
  agent: '自動提案の処理に失敗しました',
  parse: '割付結果の解析に失敗しました',
  validation: '精度ゲートにより提案を中止しました',
  apply: '仮予約の登録に失敗しました',
  rate_limited: '自動提案は連続実行できません。1分後までお待ちください。',
  internal: '自動提案の処理に失敗しました',
} as const

export type PublicProposeErrorCode = keyof typeof PUBLIC_PROPOSE_ERROR

export function toPublicProposeError(
  code: PublicProposeErrorCode,
  override?: string,
): string {
  if (override?.trim()) return override
  return PUBLIC_PROPOSE_ERROR[code]
}

/** 待機秒数を「約N分後」「N秒後」に整形する */
export function formatProposeWaitLabel(retryAfterSec: number): string {
  const sec = Math.max(1, Math.ceil(retryAfterSec))
  if (sec >= 60) {
    const minutes = Math.ceil(sec / 60)
    return minutes === 1 ? '1分後' : `約${minutes}分後`
  }
  return `${sec}秒後`
}

/**
 * レート制限時のユーザー向け文言。
 * retryAfterSec があるときは「1分後までお待ちください」のように具体化する。
 */
export function toRateLimitedProposeError(
  retryAfterSec: number,
  reason?: 'in_flight' | 'cooldown',
): string {
  const wait = formatProposeWaitLabel(retryAfterSec)
  if (reason === 'in_flight') {
    return `同じクリニックで自動提案の処理中です。${wait}までお待ちください。`
  }
  return `自動提案は連続実行できません。${wait}までお待ちください。`
}
