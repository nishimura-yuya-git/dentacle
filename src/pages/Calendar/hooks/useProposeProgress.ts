import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 自動提案の進捗％推定フック。
 * サーバーから途中経過は取れないため、前回の実所要時間（localStorage）を基準に
 * 漸近曲線で％を進め、完了時に100%へジャンプする。
 */

const STORAGE_KEY = 'dentacle:auto-propose-duration-ms'
/** 直近実測の中央値（schedule_jobs.agentDurationMs 約26秒）ベース */
const DEFAULT_ESTIMATE_MS = 30_000
const MIN_ESTIMATE_MS = 10_000
const MAX_ESTIMATE_MS = 120_000
/** 完了前に張り付く上限（100%は完了時のみ） */
const CEILING_PERCENT = 96
const TICK_MS = 200
const RESET_DELAY_MS = 500

function loadEstimateMs(): number {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const value = raw ? Number(raw) : NaN
    if (Number.isFinite(value) && value > 0) {
      return Math.min(MAX_ESTIMATE_MS, Math.max(MIN_ESTIMATE_MS, value))
    }
  } catch {
    // localStorage 不可の環境は既定値
  }
  return DEFAULT_ESTIMATE_MS
}

function saveEstimateMs(elapsedMs: number): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(Math.round(elapsedMs)))
  } catch {
    // 保存できなくても推定は既定値で動く
  }
}

export function useProposeProgress(): {
  percent: number
  active: boolean
  start: () => void
  finish: () => void
} {
  const [percent, setPercent] = useState(0)
  const [active, setActive] = useState(false)
  const startedAtRef = useRef<number | null>(null)
  const tickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimers = useCallback(() => {
    if (tickTimerRef.current) {
      clearInterval(tickTimerRef.current)
      tickTimerRef.current = null
    }
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current)
      resetTimerRef.current = null
    }
  }, [])

  useEffect(() => clearTimers, [clearTimers])

  const start = useCallback(() => {
    clearTimers()
    const estimateMs = loadEstimateMs()
    startedAtRef.current = Date.now()
    setActive(true)
    setPercent(1)
    tickTimerRef.current = setInterval(() => {
      const startedAt = startedAtRef.current
      if (startedAt === null) return
      const elapsed = Date.now() - startedAt
      // 見積り時点で約84%に達し、以降はゆっくり上限へ漸近する
      const ratio = 1 - Math.exp(-elapsed / (estimateMs * 0.55))
      setPercent(Math.min(CEILING_PERCENT, Math.max(1, Math.round(ratio * 100))))
    }, TICK_MS)
  }, [clearTimers])

  const finish = useCallback(() => {
    const startedAt = startedAtRef.current
    startedAtRef.current = null
    clearTimers()
    if (startedAt !== null) {
      saveEstimateMs(Date.now() - startedAt)
    }
    setPercent(100)
    resetTimerRef.current = setTimeout(() => {
      setActive(false)
      setPercent(0)
    }, RESET_DELAY_MS)
  }, [clearTimers])

  return { percent, active, start, finish }
}
