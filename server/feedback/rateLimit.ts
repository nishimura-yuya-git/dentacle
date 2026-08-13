/**
 * ご意見チャットの連打抑制（ユーザー単位）。
 * サーバーレス複数インスタンスでは完全ではないが、Issue 量産を抑える。
 */

export const FEEDBACK_COOLDOWN_MS = 15_000

type SlotState = {
  startedAt: number
  finishedAt: number | null
}

const slots = new Map<string, SlotState>()

export type FeedbackRateLimitOk = { ok: true }
export type FeedbackRateLimitDenied = {
  ok: false
  retryAfterSec: number
}

export type FeedbackRateLimitResult = FeedbackRateLimitOk | FeedbackRateLimitDenied

function retryAfterSec(until: number, now: number): number {
  return Math.max(1, Math.ceil((until - now) / 1000))
}

/** 取得に成功したら必ず releaseFeedbackSlot を呼ぶこと */
export function tryAcquireFeedbackSlot(
  userId: string,
  now: number = Date.now(),
  cooldownMs: number = FEEDBACK_COOLDOWN_MS,
): FeedbackRateLimitResult {
  const key = userId.trim()
  if (!key) {
    return { ok: false, retryAfterSec: 1 }
  }

  const existing = slots.get(key)
  if (existing) {
    if (existing.finishedAt === null) {
      return {
        ok: false,
        retryAfterSec: retryAfterSec(existing.startedAt + cooldownMs, now),
      }
    }
    const unlockAt = existing.finishedAt + cooldownMs
    if (now < unlockAt) {
      return {
        ok: false,
        retryAfterSec: retryAfterSec(unlockAt, now),
      }
    }
  }

  slots.set(key, { startedAt: now, finishedAt: null })
  return { ok: true }
}

export function releaseFeedbackSlot(
  userId: string,
  now: number = Date.now(),
): void {
  const key = userId.trim()
  const existing = slots.get(key)
  if (!existing) return
  slots.set(key, { startedAt: existing.startedAt, finishedAt: now })
}

/** テスト用 */
export function resetFeedbackRateLimitForTests(): void {
  slots.clear()
}
