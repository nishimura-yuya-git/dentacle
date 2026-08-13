import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import {
  GROK_VERSION_SELECT_OPTIONS,
  grokVersionFromTrackRatio,
  grokVersionStepIndex,
  type GrokVersionId,
} from '@/config/aiModelOptions'
import { shouldCommitGrokSliderOnPhase } from '@/pages/Admin/sections/modelSwitcherUx'

type Props = {
  value: GrokVersionId
  disabled?: boolean
  onChange: (next: GrokVersionId) => void
}

function ratioFromClientX(track: HTMLElement, clientX: number): number {
  const rect = track.getBoundingClientRect()
  if (rect.width <= 0) return 0
  return (clientX - rect.left) / rect.width
}

/**
 * Grok 4.5 / 4.6 の離散スライダー。
 * ドラッグ中は見た目だけ動かし、確定は指を離したとき。
 */
export function GrokVersionSlider({ value, disabled = false, onChange }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState<GrokVersionId | null>(null)
  const shown = draft ?? value
  const index = grokVersionStepIndex(shown)
  const currentLabel =
    GROK_VERSION_SELECT_OPTIONS[index]?.label ?? shown.replace('grok-', '')

  function preview(clientX: number): GrokVersionId | null {
    if (disabled || !trackRef.current) return null
    return grokVersionFromTrackRatio(ratioFromClientX(trackRef.current, clientX))
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (disabled) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const next = preview(event.clientX)
    if (next) setDraft(next)
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (disabled || !event.currentTarget.hasPointerCapture(event.pointerId)) return
    const next = preview(event.clientX)
    if (next) setDraft(next)
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (disabled) return
    const next = preview(event.clientX) ?? draft
    setDraft(null)
    if (next && next !== value && shouldCommitGrokSliderOnPhase('up')) {
      onChange(next)
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return
    if (event.key === 'ArrowLeft' || event.key === 'Home') {
      event.preventDefault()
      onChange('grok-4.5')
    }
    if (event.key === 'ArrowRight' || event.key === 'End') {
      event.preventDefault()
      onChange('grok-4.6')
    }
  }

  return (
    <div className="min-w-0">
      <div
        ref={trackRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label="Grokの版"
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={index}
        aria-valuetext={currentLabel}
        aria-disabled={disabled}
        className={[
          'relative h-8 outline-none focus-visible:ring-2 focus-visible:ring-[#008C01]/30',
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        ].join(' ')}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => setDraft(null)}
        onKeyDown={handleKeyDown}
      >
        <div className="absolute inset-x-0 top-1/2 h-3.5 -translate-y-1/2 rounded-full bg-[#D5EDD5]" />
        <div className="pointer-events-none absolute inset-x-3 top-1/2 flex -translate-y-1/2 justify-between">
          <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
        </div>
        <div
          className="pointer-events-none absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-white shadow-sm ring-1 ring-slate-200/70"
          style={{ left: index === 0 ? '0.15rem' : 'auto', right: index === 1 ? '0.15rem' : 'auto' }}
        />
      </div>
      <div className="mt-1 flex justify-between gap-2 text-[11px] font-bold text-slate-500">
        {GROK_VERSION_SELECT_OPTIONS.map((option) => (
          <span key={option.value}>{option.label}</span>
        ))}
      </div>
    </div>
  )
}
