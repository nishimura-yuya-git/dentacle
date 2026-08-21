import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react'
import { normalizeOtpDigits, otpDigitsArray } from '@/pages/Login/otpCodeUtils'

type Props = {
  id: string
  value: string
  onChange: (code: string) => void
  onComplete?: (code: string) => void
  disabled?: boolean
  label?: string
}

/**
 * 6マスの数字入力。見た目は分割、コピペは6桁まとめて貼れる。
 */
export function OtpCodeInput({
  id,
  value,
  onChange,
  onComplete,
  disabled = false,
  label = '確認コード',
}: Props) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([])
  const digits = otpDigitsArray(value, 6)

  function focusAt(index: number) {
    const el = inputsRef.current[Math.max(0, Math.min(5, index))]
    el?.focus()
    el?.select()
  }

  function commitCode(nextCode: string) {
    const normalized = normalizeOtpDigits(nextCode, 6)
    onChange(normalized)
    if (normalized.length === 6) onComplete?.(normalized)
  }

  function commit(nextDigits: string[]) {
    commitCode(nextDigits.join(''))
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault()
    const pasted = normalizeOtpDigits(event.clipboardData.getData('text'), 6)
    if (!pasted) return
    commitCode(pasted)
    focusAt(Math.min(pasted.length, 5))
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace') {
      if (digits[index]) {
        const next = [...digits]
        next[index] = ''
        commit(next)
        return
      }
      if (index > 0) {
        event.preventDefault()
        const next = [...digits]
        next[index - 1] = ''
        commit(next)
        focusAt(index - 1)
      }
      return
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      focusAt(index - 1)
      return
    }
    if (event.key === 'ArrowRight' && index < 5) {
      event.preventDefault()
      focusAt(index + 1)
    }
  }

  function handleChange(index: number, raw: string) {
    const cleaned = normalizeOtpDigits(raw, 6)
    if (!cleaned) {
      const next = [...digits]
      next[index] = ''
      commit(next)
      return
    }
    // 1マスに複数入った／オートフィル相当も6桁へ展開
    if (cleaned.length > 1) {
      commitCode(cleaned)
      focusAt(Math.min(cleaned.length, 5))
      return
    }
    const next = [...digits]
    next[index] = cleaned
    commit(next)
    if (index < 5) focusAt(index + 1)
  }

  return (
    <div className="space-y-3">
      <label htmlFor={`${id}-0`} className="block text-sm font-bold text-slate-800">
        {label}
      </label>
      <div className="flex items-center justify-center gap-2 sm:gap-2.5" role="group" aria-label={label}>
        {digits.map((digit, index) => (
          <input
            key={`${id}-${index}`}
            id={index === 0 ? `${id}-0` : `${id}-${index}`}
            ref={(el) => {
              inputsRef.current[index] = el
            }}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            name={index === 0 ? 'one-time-code' : undefined}
            aria-label={`${label} ${index + 1}桁目`}
            disabled={disabled}
            value={digit}
            maxLength={6}
            onPaste={handlePaste}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onChange={(event) => handleChange(index, event.target.value)}
            onFocus={(event) => event.currentTarget.select()}
            className="size-12 shrink-0 rounded-xl border border-slate-200 bg-white text-center text-lg font-bold text-slate-900 outline-none transition focus:border-[#008C01] focus:ring-4 focus:ring-[#008C01]/20 disabled:bg-slate-50 sm:size-14 sm:text-xl"
          />
        ))}
      </div>
    </div>
  )
}
