import { useCallback, useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { ComposingOrb } from '@/components/ui/ComposingOrb'
import { Select } from '@/components/ui/Select'
import { TimePicker } from '@/components/ui/TimePicker'
import {
  formatGapFillRateLimitMessage,
  isCalendarGapFillError,
  parseRetryAfterSecFromMessage,
} from '@/features/calendar/calendarGapFillError'
import {
  runCalendarGapFill,
  type GapFillCandidate,
} from '@/features/calendar/runCalendarGapFill'
import { useAnchoredPopover } from '@/pages/Calendar/hooks/useAnchoredPopover'

export type GapFillSeed = {
  teamId: string
  startTime: string
  endTime: string
}

type PatientOption = { id: string; name_kanji: string }

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  seed: GapFillSeed | null
  clinicId: string
  targetDate: string
  vehicleTeamIds: string[]
  teamOptions: { value: string; label: string }[]
  patients: PatientOption[]
  disabled?: boolean
  onAdopt: (input: {
    patientId: string
    teamId: string
    startTime: string
    endTime: string
  }) => Promise<boolean>
  onOpenManualCreate: (seed: GapFillSeed) => void
}

const PANEL_WIDTH = 380

function toHhMm(value: string): string {
  return value.slice(0, 5)
}

function patientLabel(
  patients: PatientOption[],
  patientId: string,
): string {
  const hit = patients.find((p) => p.id === patientId)
  return hit?.name_kanji?.trim() || `患者（${patientId.slice(0, 8)}…）`
}

/**
 * 空き枠埋めパネル（近傍ポップオーバー + 短い対話 + 候補採用）。
 * 主導線の自動提案とは別モード。
 */
export function GapFillPanel({
  open,
  onOpenChange,
  seed,
  clinicId,
  targetDate,
  vehicleTeamIds,
  teamOptions,
  patients,
  disabled = false,
  onAdopt,
  onOpenManualCreate,
}: Props) {
  const panelId = useId()
  const close = useCallback(() => onOpenChange(false), [onOpenChange])
  const { buttonRef, panelRef, pos } = useAnchoredPopover({
    open,
    onClose: close,
    panelWidth: PANEL_WIDTH,
  })

  const defaultTeamId = seed?.teamId || teamOptions[0]?.value || ''
  const [teamId, setTeamId] = useState(defaultTeamId)
  const [startTime, setStartTime] = useState(toHhMm(seed?.startTime || '09:30'))
  const [endTime, setEndTime] = useState(toHhMm(seed?.endTime || '10:30'))
  const [userMessage, setUserMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [adoptingId, setAdoptingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  /** レート制限解除時刻（epoch ms）。表示は毎秒カウントダウン */
  const [rateLimitUntilMs, setRateLimitUntilMs] = useState<number | null>(null)
  const [candidates, setCandidates] = useState<GapFillCandidate[]>([])
  const rateLimited = rateLimitUntilMs !== null

  useEffect(() => {
    if (!open) return
    setTeamId(seed?.teamId || teamOptions[0]?.value || '')
    setStartTime(toHhMm(seed?.startTime || '09:30'))
    setEndTime(toHhMm(seed?.endTime || '10:30'))
    setUserMessage(
      seed
        ? `${toHhMm(seed.startTime)}〜${toHhMm(seed.endTime)}でいけそうな人いる？`
        : '',
    )
    setCandidates([])
    setError(null)
    setRateLimitUntilMs(null)
  }, [open, seed, teamOptions])

  useEffect(() => {
    if (rateLimitUntilMs === null) return

    const tick = () => {
      const leftSec = Math.ceil((rateLimitUntilMs - Date.now()) / 1000)
      if (leftSec <= 0) {
        setRateLimitUntilMs(null)
        setError('まもなく再実行できます。もう一度お試しください。')
        return
      }
      setError(formatGapFillRateLimitMessage(leftSec))
    }

    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [rateLimitUntilMs])

  const search = async () => {
    if (!clinicId || !teamId || busy || rateLimited) return
    setBusy(true)
    setError(null)
    setRateLimitUntilMs(null)
    setCandidates([])
    try {
      const result = await runCalendarGapFill({
        clinicId,
        targetDate,
        vehicleTeamIds,
        teamId,
        windowStart: `${startTime}:00`,
        windowEnd: `${endTime}:00`,
        userMessage:
          userMessage.trim() ||
          `${startTime}〜${endTime}でいけそうな人いる？`,
      })
      setCandidates(result.candidates)
      if (result.candidates.length === 0) {
        setError('候補が見つかりませんでした')
      }
    } catch (err) {
      const retryAfterSec = isCalendarGapFillError(err)
        ? err.retryAfterSec ??
          parseRetryAfterSecFromMessage(err.message)
        : err instanceof Error
          ? parseRetryAfterSecFromMessage(err.message)
          : null
      if (retryAfterSec && retryAfterSec > 0) {
        setRateLimitUntilMs(Date.now() + retryAfterSec * 1000)
        setError(formatGapFillRateLimitMessage(retryAfterSec))
      } else {
        setError(
          err instanceof Error ? err.message : '空き枠埋めに失敗しました',
        )
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        className={[
          'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full font-bold transition',
          'bg-slate-50 px-3 py-1.5 text-xs text-slate-700',
          'hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200',
          'disabled:cursor-not-allowed disabled:bg-slate-50/60 disabled:text-slate-300',
        ].join(' ')}
        onClick={() => onOpenChange(!open)}
      >
        <img
          src="/icon/ai.png"
          alt=""
          width={14}
          height={14}
          className="h-3.5 w-3.5 shrink-0 brightness-0 opacity-40"
        />
        空きを埋める
      </button>

      {open
        ? createPortal(
            <div
              ref={panelRef}
              id={panelId}
              role="dialog"
              aria-modal="true"
              aria-label="空きを埋める"
              style={{ top: pos.top, left: pos.left }}
              className="fixed z-[60] max-h-[min(36rem,calc(100vh-2rem))] w-[min(23.75rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-slate-100 bg-white p-4 shadow-2xl"
            >
              <p className="text-sm font-bold text-slate-900">空きを埋める</p>
              <p className="mt-1 text-xs font-medium leading-relaxed text-slate-400">
                前後の訪問に住所が近い患者を優先して提案します。期限が遠くても近い人は注意付きで出ます。住所未登録の患者は候補に入りません。
              </p>

              <div className="mt-3 space-y-3">
                <Select
                  label="号車"
                  size="sm"
                  labelTone="muted"
                  options={teamOptions}
                  value={teamId}
                  onChange={(event) => setTeamId(event.target.value)}
                  disabled={busy}
                />
                <div className="grid grid-cols-2 gap-2">
                  <TimePicker
                    label="開始"
                    size="sm"
                    labelTone="muted"
                    value={startTime}
                    disabled={busy}
                    minuteStep={5}
                    minHour={8}
                    maxHour={20}
                    onChange={setStartTime}
                  />
                  <TimePicker
                    label="終了"
                    size="sm"
                    labelTone="muted"
                    value={endTime}
                    disabled={busy}
                    minuteStep={5}
                    minHour={8}
                    maxHour={20}
                    onChange={setEndTime}
                  />
                </div>
                <label className="block space-y-1">
                  <span className="block text-[11px] font-bold text-slate-400">
                    依頼
                  </span>
                  <textarea
                    value={userMessage}
                    disabled={busy}
                    rows={2}
                    placeholder="例: 9:30〜10:30でいけそうな人いる？"
                    onChange={(event) => setUserMessage(event.target.value)}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#008C01] focus:ring-4 focus:ring-[#008C01]/20"
                  />
                </label>
                {busy ? (
                  <div
                    className="flex flex-col items-center gap-2 py-4"
                    role="status"
                    aria-live="polite"
                    aria-label="候補を探しています"
                  >
                    <ComposingOrb size={64} label="候補を探しています" />
                    <p className="text-xs font-bold text-slate-600">
                      候補を探しています
                    </p>
                  </div>
                ) : null}
                <Button
                  variant="primary"
                  className="!w-full !px-3 !py-2 !text-xs"
                  disabled={!teamId || rateLimited || busy}
                  aria-busy={busy}
                  onClick={() => void search()}
                >
                  {rateLimited ? '待機中…' : busy ? '探しています…' : '候補を探す'}
                </Button>
              </div>

              {error ? (
                <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                  {error}
                </p>
              ) : null}

              {candidates.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {candidates.map((candidate) => (
                    <li
                      key={candidate.patientId}
                      className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3"
                    >
                      <p className="text-sm font-bold text-slate-900">
                        {patientLabel(patients, candidate.patientId)}
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                        {toHhMm(candidate.proposedStart)}〜
                        {toHhMm(candidate.proposedEnd)}
                      </p>
                      <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">
                        {candidate.reason}
                      </p>
                      {candidate.warnings.length > 0 ? (
                        <ul className="mt-1.5 space-y-0.5">
                          {candidate.warnings.map((warn) => (
                            <li
                              key={warn}
                              className="text-[11px] font-bold text-amber-700"
                            >
                              注意: {warn}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <div className="mt-2.5 flex justify-end">
                        <Button
                          variant="primary"
                          className="!px-3 !py-1.5 !text-xs"
                          loading={adoptingId === candidate.patientId}
                          disabled={busy || adoptingId !== null}
                          onClick={() => {
                            void (async () => {
                              setAdoptingId(candidate.patientId)
                              const ok = await onAdopt({
                                patientId: candidate.patientId,
                                teamId,
                                startTime: toHhMm(candidate.proposedStart),
                                endTime: toHhMm(candidate.proposedEnd),
                              })
                              setAdoptingId(null)
                              if (ok) close()
                            })()
                          }}
                        >
                          仮予約にする
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="mt-4 flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="text-xs font-bold text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
                  onClick={() => {
                    onOpenManualCreate({
                      teamId,
                      startTime,
                      endTime,
                    })
                    close()
                  }}
                >
                  手動で登録
                </button>
                <Button
                  variant="secondary"
                  className="!px-3 !py-1.5 !text-xs"
                  disabled={busy}
                  onClick={close}
                >
                  閉じる
                </Button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
