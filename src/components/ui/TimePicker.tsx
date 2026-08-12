import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { createPortal } from 'react-dom'
import {
  buildHourOptions,
  buildMinuteOptions,
  formatTimeHm,
  parseTimeHm,
  snapMinute,
} from '@/components/ui/timePickerUtils'

type Props = {
  label?: string
  value?: string
  onChange?: (value: string) => void
  disabled?: boolean
  id?: string
  name?: string
  className?: string
  required?: boolean
  placeholder?: string
  size?: 'sm' | 'md'
  labelTone?: 'default' | 'muted'
  /** 分の刻み（既定 5） */
  minuteStep?: number
  minHour?: number
  maxHour?: number
}

function ClockGlyph({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className={['h-4 w-4', className].join(' ')}
    >
      <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 6.25V10l2.5 1.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * 独自時刻ピッカー（ネイティブ type=time UI 禁止）。
 * 時・分の2列スクロール。メニューは portal（近傍ポップオーバー内でも使える）。
 */
export function TimePicker({
  label,
  value = '',
  onChange,
  disabled = false,
  id,
  name,
  className = '',
  required = false,
  placeholder = '時刻を選択',
  size = 'md',
  labelTone = 'default',
  minuteStep = 5,
  minHour = 0,
  maxHour = 23,
}: Props) {
  const autoId = useId()
  const pickerId = id ?? name ?? autoId
  const panelId = `${pickerId}-panel`
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const hourListRef = useRef<HTMLUListElement>(null)
  const minuteListRef = useRef<HTMLUListElement>(null)
  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({})

  const hours = useMemo(
    () => buildHourOptions(minHour, maxHour),
    [minHour, maxHour],
  )
  const minutes = useMemo(
    () => buildMinuteOptions(minuteStep),
    [minuteStep],
  )

  const parsed = parseTimeHm(value)
  const display = parsed
    ? formatTimeHm(parsed.hour, snapMinute(parsed.minute, minuteStep))
    : ''
  const selectedHour = parsed?.hour ?? null
  const selectedMinute = parsed
    ? snapMinute(parsed.minute, minuteStep)
    : null

  const triggerPadding =
    size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-4 py-3 text-sm'
  const rootGap = size === 'sm' ? 'space-y-1' : 'space-y-2'

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return

    function place() {
      const trigger = triggerRef.current
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      const gap = 6
      const panelWidth = Math.max(rect.width, 168)
      const estimatedHeight = 240
      const spaceBelow = window.innerHeight - rect.bottom - gap
      const openUp = spaceBelow < estimatedHeight && rect.top > spaceBelow
      const left = Math.min(
        Math.max(8, rect.left),
        window.innerWidth - panelWidth - 8,
      )

      setMenuStyle({
        position: 'fixed',
        top: openUp ? undefined : rect.bottom + gap,
        bottom: openUp ? window.innerHeight - rect.top + gap : undefined,
        left,
        width: panelWidth,
        zIndex: 70,
      })
    }

    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (rootRef.current?.contains(target)) return
      const panel = document.getElementById(panelId)
      if (panel?.contains(target)) return
      setOpen(false)
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, panelId])

  useLayoutEffect(() => {
    if (!open) return
    const scrollSelected = (
      list: HTMLUListElement | null,
      attr: string,
      current: number | null,
    ) => {
      if (!list || current === null) return
      const item = list.querySelector<HTMLElement>(`[data-${attr}="${current}"]`)
      item?.scrollIntoView({ block: 'center' })
    }
    scrollSelected(hourListRef.current, 'hour', selectedHour)
    scrollSelected(minuteListRef.current, 'minute', selectedMinute)
  }, [open, selectedHour, selectedMinute])

  function emit(hour: number, minute: number) {
    onChange?.(formatTimeHm(hour, snapMinute(minute, minuteStep)))
  }

  function pickHour(hour: number) {
    const minute = selectedMinute ?? 0
    emit(hour, minute)
  }

  function pickMinute(minute: number) {
    const hour = selectedHour ?? minHour
    emit(hour, minute)
    setOpen(false)
  }

  const labelClass =
    labelTone === 'muted'
      ? 'block text-[11px] font-bold text-slate-400'
      : 'block text-sm font-bold text-slate-800'

  return (
    <div ref={rootRef} className={[rootGap, className].filter(Boolean).join(' ')}>
      {label ? (
        <label htmlFor={pickerId} className={labelClass}>
          {label}
          {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
        </label>
      ) : null}

      <input
        type="text"
        id={`${pickerId}-native`}
        name={name}
        value={value}
        required={required}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        readOnly
        onChange={() => undefined}
      />

      <button
        ref={triggerRef}
        id={pickerId}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        className={[
          'inline-flex w-full items-center justify-between gap-2 border border-slate-200 bg-white text-left font-medium text-slate-800 outline-none transition',
          size === 'sm' ? 'rounded-lg' : 'rounded-xl',
          'hover:bg-slate-50 focus-visible:border-[#008C01] focus-visible:ring-4 focus-visible:ring-[#008C01]/20',
          'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
          triggerPadding,
        ].join(' ')}
        onClick={() => {
          if (!disabled) setOpen((current) => !current)
        }}
      >
        <span
          className={
            display ? 'truncate tabular-nums' : 'truncate text-slate-400'
          }
        >
          {display || placeholder}
        </span>
        <ClockGlyph className="shrink-0 text-slate-500" />
      </button>

      {open
        ? createPortal(
            <div
              id={panelId}
              role="dialog"
              aria-label={label ? `${label}を選択` : '時刻を選択'}
              data-anchored-ignore-outside="true"
              style={menuStyle}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg"
            >
              <div className="grid grid-cols-2 border-b border-slate-100">
                <p className="px-3 py-2 text-center text-[11px] font-bold text-slate-400">
                  時
                </p>
                <p className="px-3 py-2 text-center text-[11px] font-bold text-slate-400">
                  分
                </p>
              </div>
              <div className="grid grid-cols-2">
                <ul
                  ref={hourListRef}
                  className="max-h-52 overflow-y-auto border-r border-slate-100 py-1.5"
                  role="listbox"
                  aria-label="時"
                >
                  {hours.map((option) => {
                    const active = option.value === selectedHour
                    return (
                      <li key={option.value} role="option" aria-selected={active}>
                        <button
                          type="button"
                          data-hour={option.value}
                          className={[
                            'mx-1.5 flex w-[calc(100%-0.75rem)] items-center justify-center rounded-lg px-2 py-1.5 text-sm font-bold tabular-nums transition',
                            active
                              ? 'bg-[#008C01] text-white'
                              : 'text-slate-800 hover:bg-slate-50',
                          ].join(' ')}
                          onClick={() => pickHour(option.value)}
                        >
                          {option.label}
                        </button>
                      </li>
                    )
                  })}
                </ul>
                <ul
                  ref={minuteListRef}
                  className="max-h-52 overflow-y-auto py-1.5"
                  role="listbox"
                  aria-label="分"
                >
                  {minutes.map((option) => {
                    const active = option.value === selectedMinute
                    return (
                      <li key={option.value} role="option" aria-selected={active}>
                        <button
                          type="button"
                          data-minute={option.value}
                          className={[
                            'mx-1.5 flex w-[calc(100%-0.75rem)] items-center justify-center rounded-lg px-2 py-1.5 text-sm font-bold tabular-nums transition',
                            active
                              ? 'bg-[#008C01] text-white'
                              : 'text-slate-800 hover:bg-slate-50',
                          ].join(' ')}
                          onClick={() => pickMinute(option.value)}
                        >
                          {option.label}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
