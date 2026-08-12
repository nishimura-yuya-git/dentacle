/**
 * 自動提案の同時実行排他 + クールダウン（クリニック単位）。
 * サーバーレス複数インスタンスでは完全ではないが、連打による課金・負荷を抑える。
 */

export const PROPOSE_COOLDOWN_MS = 60_000

type SlotState = {
  startedAt: number
  finishedAt: number | null
}

const slots = new Map<string, SlotState>()

export type ProposeRateLimitOk = { ok: true }
export type ProposeRateLimitDenied = {
  ok: false
  retryAfterSec: number
  reason: 'in_flight' | 'cooldown'
}

export type ProposeRateLimitResult = ProposeRateLimitOk | ProposeRateLimitDenied

function retryAfterSec(until: number, now: number): number {
  return Math.max(1, Math.ceil((until - now) / 1000))
}

/** 取得に成功したら必ず releaseProposeSlot を呼ぶこと */
export function tryAcquireProposeSlot(
  clinicId: string,
  now: number = Date.now(),
  cooldownMs: number = PROPOSE_COOLDOWN_MS,
): ProposeRateLimitResult {
  const key = clinicId.trim()
  if (!key) {
    return { ok: false, retryAfterSec: 1, reason: 'cooldown' }
  }

  const existing = slots.get(key)
  if (existing) {
    if (existing.finishedAt === null) {
      return {
        ok: false,
        retryAfterSec: retryAfterSec(existing.startedAt + cooldownMs, now),
        reason: 'in_flight',
      }
    }
    const unlockAt = existing.finishedAt + cooldownMs
    if (now < unlockAt) {
      return {
        ok: false,
        retryAfterSec: retryAfterSec(unlockAt, now),
        reason: 'cooldown',
      }
    }
  }

  slots.set(key, { startedAt: now, finishedAt: null })
  return { ok: true }
}

export function releaseProposeSlot(
  clinicId: string,
  now: number = Date.now(),
): void {
  const key = clinicId.trim()
  const existing = slots.get(key)
  if (!existing) return
  slots.set(key, { startedAt: existing.startedAt, finishedAt: now })
}

/** テスト用 */
export function resetProposeRateLimitForTests(): void {
  slots.clear()
}
