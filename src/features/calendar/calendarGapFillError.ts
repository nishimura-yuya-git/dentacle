/** 空き枠埋め API のクライアント向けエラー（レート制限秒数付き） */
export class CalendarGapFillError extends Error {
  readonly code?: string
  readonly retryAfterSec?: number

  constructor(
    message: string,
    options?: { code?: string; retryAfterSec?: number },
  ) {
    super(message)
    this.name = 'CalendarGapFillError'
    this.code = options?.code
    this.retryAfterSec = options?.retryAfterSec
  }
}

export function isCalendarGapFillError(
  err: unknown,
): err is CalendarGapFillError {
  return err instanceof CalendarGapFillError
}

/** メッセージ中の「N秒後」をフォールバック抽出 */
export function parseRetryAfterSecFromMessage(message: string): number | null {
  const match = /(\d+)\s*秒後/.exec(message)
  if (!match?.[1]) return null
  const sec = Number(match[1])
  return Number.isFinite(sec) && sec > 0 ? sec : null
}

export function formatGapFillRateLimitMessage(secondsLeft: number): string {
  const sec = Math.max(0, Math.ceil(secondsLeft))
  if (sec <= 0) return 'まもなく再実行できます。もう一度お試しください。'
  return `空き枠埋めは連続実行できません。${sec}秒後までお待ちください。`
}
