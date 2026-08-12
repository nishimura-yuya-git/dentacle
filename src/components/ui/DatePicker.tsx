import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { createPortal } from 'react-dom'
import { CalendarGlyph, DatePickerPanel } from '@/components/ui/DatePickerPanel'
import { formatDateSlash, parseISODate } from '@/components/ui/datePickerUtils'

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
  clearable?: boolean
  /** 横並びラベル（ヘッダー日付ナビ用） */
  inline?: boolean
}

/**
 * 独自日付ピッカー（ネイティブ type=date UI 禁止）。
 * トリガー＋丸角月カレンダー。メニューは portal でクリップ回避。
 */
export function DatePicker({
  label,
  value = '',
  onChange,
  disabled = false,
  id,
  name,
  className = '',
  required = false,
  placeholder = '日付を選択',
  size = 'md',
  labelTone = 'default',
  clearable = false,
  inline = false,
}: Props) {
  const autoId = useId()
  const pickerId = id ?? name ?? autoId
  const panelId = `${pickerId}-panel`
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({})

  const selectedDate = parseISODate(value)
  const initialCursor = selectedDate ?? new Date()
  const [cursorYear, setCursorYear] = useState(initialCursor.getFullYear())
  const [cursorMonth, setCursorMonth] = useState(initialCursor.getMonth())

  useEffect(() => {
    if (!open) return
    const base = parseISODate(value) ?? new Date()
    setCursorYear(base.getFullYear())
    setCursorMonth(base.getMonth())
  }, [open, value])

  const display = value ? formatDateSlash(value) : ''
  const triggerPadding = size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-4 py-3 text-sm'
  const rootGap = inline ? '' : size === 'sm' ? 'space-y-1' : 'space-y-2'

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return

    function place() {
      const trigger = triggerRef.current
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      const gap = 6
      const panelWidth = 288
      const estimatedHeight = 340
      const spaceBelow = window.innerHeight - rect.bottom - gap
      const openUp = spaceBelow < estimatedHeight && rect.top > spaceBelow
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - panelWidth - 8)

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

  function emit(next: string) {
    onChange?.(next)
  }

  function choose(iso: string) {
    emit(iso)
    setOpen(false)
  }

  const labelClass =
    labelTone === 'muted' || inline
      ? inline
        ? 'shrink-0 text-xs font-bold text-slate-500'
        : 'block text-[11px] font-bold text-slate-500'
      : 'block text-sm font-bold text-slate-800'

  return (
    <div
      ref={rootRef}
      className={[inline ? 'inline-flex items-center gap-1.5' : rootGap, className]
        .filter(Boolean)
        .join(' ')}
    >
      {label ? (
        <label htmlFor={pickerId} className={labelClass}>
          {label}
          {required && !inline ? <span className="ml-0.5 text-rose-500">*</span> : null}
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
          'inline-flex items-center justify-between gap-2 border border-slate-200 bg-white text-left font-medium text-slate-800 outline-none transition',
          inline ? 'w-auto min-w-[132px]' : 'w-full',
          size === 'sm' ? 'rounded-lg' : 'rounded-xl',
          'hover:bg-slate-50 focus-visible:border-[#008C01] focus-visible:ring-4 focus-visible:ring-[#008C01]/20',
          'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
          triggerPadding,
        ].join(' ')}
        onClick={() => {
          if (!disabled) setOpen((current) => !current)
        }}
      >
        <span className={display ? 'truncate tabular-nums' : 'truncate text-slate-400'}>
          {display || placeholder}
        </span>
        <CalendarGlyph className="shrink-0 text-slate-500" />
      </button>

      {open
        ? createPortal(
            <DatePickerPanel
              panelId={panelId}
              style={menuStyle}
              value={value}
              cursorYear={cursorYear}
              cursorMonth={cursorMonth}
              clearable={clearable}
              onCursorChange={(year, monthIndex) => {
                setCursorYear(year)
                setCursorMonth(monthIndex)
              }}
              onChoose={choose}
              onClear={() => {
                emit('')
                setOpen(false)
              }}
            />,
            document.body
          )
        : null}
    </div>
  )
}
