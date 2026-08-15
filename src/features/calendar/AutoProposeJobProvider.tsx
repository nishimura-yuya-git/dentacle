import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useToast } from '@/components/ui/Toast'
import {
  AUTO_PROPOSE_STATUS_HOLD_MS,
  formatAutoProposeErrorToast,
  formatAutoProposeSuccessToast,
  type AutoProposePhase,
} from '@/features/calendar/autoProposeJob'
import {
  AutoProposeJobContext,
  type AutoProposeLastResult,
  type AutoProposeStartInput,
} from '@/features/calendar/autoProposeJobContext'
import { runCalendarAutoPropose } from '@/features/calendar/runCalendarAutoPropose'
import { useProposeProgress } from '@/pages/Calendar/hooks/useProposeProgress'

/**
 * 自動提案ジョブをルート変更から独立させる。
 * 割付本体は runCalendarAutoPropose に委譲する。
 */
export function AutoProposeJobProvider({ children }: { children: ReactNode }) {
  const toast = useToast()
  const {
    percent,
    active: progressActive,
    start: startProgress,
    finish: finishProgress,
  } = useProposeProgress()
  const [phase, setPhase] = useState<AutoProposePhase>('idle')
  const [clinicId, setClinicId] = useState<string | null>(null)
  const [targetDate, setTargetDate] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<AutoProposeLastResult | null>(null)
  const runningRef = useRef(false)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resultSeqRef = useRef(0)

  const clearHideTimer = useCallback(() => {
    if (!hideTimerRef.current) return
    clearTimeout(hideTimerRef.current)
    hideTimerRef.current = null
  }, [])

  useEffect(() => () => clearHideTimer(), [clearHideTimer])

  const start = useCallback(
    (input: AutoProposeStartInput) => {
      if (runningRef.current) return
      runningRef.current = true
      clearHideTimer()
      setClinicId(input.clinicId)
      setTargetDate(input.targetDate)
      setPhase('running')
      startProgress()

      void (async () => {
        try {
          const result = await runCalendarAutoPropose(input)
          toast.success(formatAutoProposeSuccessToast(result))
          resultSeqRef.current += 1
          setLastResult({
            id: resultSeqRef.current,
            clinicId: input.clinicId,
            targetDate: input.targetDate,
            ok: true,
          })
          setPhase('success')
        } catch (err) {
          const message =
            err instanceof Error ? err.message : '自動提案に失敗しました'
          toast.error(formatAutoProposeErrorToast(message))
          resultSeqRef.current += 1
          setLastResult({
            id: resultSeqRef.current,
            clinicId: input.clinicId,
            targetDate: input.targetDate,
            ok: false,
          })
          setPhase('error')
        } finally {
          runningRef.current = false
          finishProgress()
          hideTimerRef.current = setTimeout(() => {
            setPhase('idle')
            hideTimerRef.current = null
          }, AUTO_PROPOSE_STATUS_HOLD_MS)
        }
      })()
    },
    [clearHideTimer, finishProgress, startProgress, toast],
  )

  const value = useMemo(
    () => ({
      phase,
      percent,
      progressActive,
      clinicId,
      targetDate,
      lastResult,
      start,
    }),
    [clinicId, lastResult, percent, phase, progressActive, start, targetDate],
  )

  return (
    <AutoProposeJobContext.Provider value={value}>{children}</AutoProposeJobContext.Provider>
  )
}
