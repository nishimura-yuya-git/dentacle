import { useEffect, useId, useState, type ReactNode } from 'react'
import {
  digitsOnly,
  parseStepperInt,
  stepStepperInt,
} from './numberStepperPolicy.ts'

type Props = {
  label: string
  value: number
  onChange: (next: number) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  id?: string
}

/** 数値の増減。ネイティブ type=number のスピナーは出さない。 */
export function NumberStepper({
  label,
  value,
  onChange,
  min = 1,
  max = 240,
  step = 5,
  disabled = false,
  id,
}: Props) {
  const autoId = useId()
  const inputId = id ?? autoId
  const [draft, setDraft] = useState(String(value))

  useEffect(() => {
    setDraft(String(value))
  }, [value])

  function commit(raw: string) {
    const next = parseStepperInt(raw, value, min, max)
    setDraft(String(next))
    if (next !== value) onChange(next)
  }

  function stepBy(delta: number) {
    const next = stepStepperInt(value, delta, min, max)
    setDraft(String(next))
    if (next !== value) onChange(next)
  }

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="block text-sm font-bold text-slate-800">
        {label}
      </label>
      <div
        className={[
          'flex items-stretch overflow-hidden rounded-xl border border-slate-200 bg-white',
          'focus-within:border-[#008C01] focus-within:ring-4 focus-within:ring-[#008C01]/20',
          disabled ? 'opacity-50' : '',
        ].join(' ')}
      >
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          disabled={disabled}
          value={draft}
          onChange={(event) => setDraft(digitsOnly(event.target.value))}
          onBlur={() => commit(draft)}
          className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm tabular-nums text-slate-900 outline-none"
        />
        <div className="flex shrink-0 border-l border-slate-100">
          <StepButton
            label="減らす"
            disabled={disabled || value <= min}
            onClick={() => stepBy(-step)}
          >
            <MinusGlyph />
          </StepButton>
          <StepButton
            label="増やす"
            disabled={disabled || value >= max}
            onClick={() => stepBy(step)}
          >
            <PlusGlyph />
          </StepButton>
        </div>
      </div>
    </div>
  )
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex w-9 items-center justify-center text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  )
}

function MinusGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M2 6h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function PlusGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M2 6h8M6 2v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
