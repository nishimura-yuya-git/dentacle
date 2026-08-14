import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { placeSelectMenu } from '@/components/ui/placeSelectMenu'

export type SelectOption = { value: string; label: string }

type SelectChangeEvent = ChangeEvent<HTMLSelectElement>

type Props = {
  label?: string
  options: SelectOption[]
  value?: string
  defaultValue?: string
  onChange?: (event: SelectChangeEvent) => void
  disabled?: boolean
  id?: string
  name?: string
  className?: string
  required?: boolean
  placeholder?: string
  /** md: フォーム用 / sm: ページ件数などコンパクト */
  size?: 'sm' | 'md'
  /** ラベルを小さくする（フィルタ用） */
  labelTone?: 'default' | 'muted'
}

/**
 * 独自セレクト（ネイティブ select UI 禁止）。
 * トリガー＋丸角メニュー＋選択チェック。メニューは portal でクリップ回避。
 */
export function Select({
  label,
  options,
  value: valueProp,
  defaultValue,
  onChange,
  disabled = false,
  id,
  name,
  className = '',
  required = false,
  placeholder = '選択してください',
  size = 'md',
  labelTone = 'default',
}: Props) {
  const autoId = useId()
  const selectId = id ?? name ?? autoId
  const listId = `${selectId}-listbox`
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? '')
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({})

  const isControlled = valueProp !== undefined
  const value = isControlled ? valueProp : uncontrolled

  const selected = options.find((option) => option.value === value)
  const triggerPadding = size === 'sm' ? 'px-3 py-2.5 text-sm' : 'px-4 py-3 text-sm'
  const rootGap = size === 'sm' ? 'space-y-1' : 'space-y-2'

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return

    function place() {
      const trigger = triggerRef.current
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      setMenuStyle(
        placeSelectMenu(
          {
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
            width: rect.width,
          },
          { width: window.innerWidth, height: window.innerHeight },
          options.length,
          options.map((option) => option.label),
        ),
      )
    }

    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, options])

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (rootRef.current?.contains(target)) return
      const menu = document.getElementById(listId)
      if (menu?.contains(target)) return
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
  }, [open, listId])

  function emit(next: string) {
    if (!isControlled) setUncontrolled(next)
    if (onChange) {
      const event = {
        target: { value: next, name: name ?? '', id: selectId },
        currentTarget: { value: next, name: name ?? '', id: selectId },
      } as SelectChangeEvent
      onChange(event)
    }
  }

  function choose(next: string) {
    emit(next)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className={[rootGap, className].filter(Boolean).join(' ')}>
      {label ? (
        <label
          htmlFor={selectId}
          className={
            labelTone === 'muted'
              ? 'block text-[11px] font-bold text-slate-500'
              : 'block text-sm font-bold text-slate-800'
          }
        >
          {label}
          {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
        </label>
      ) : null}

      {/* フォーム送信・required 用の同期（画面には出さない） */}
      <select
        id={`${selectId}-native`}
        name={name}
        value={value ?? ''}
        required={required}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        onChange={(event) => emit(event.target.value)}
      >
        {!value ? <option value="" /> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <button
        ref={triggerRef}
        id={selectId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
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
        <span className={selected ? 'min-w-0 truncate' : 'min-w-0 truncate text-slate-400'}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronIcon className={['shrink-0 text-slate-500 transition', open ? 'rotate-180' : ''].join(' ')} />
      </button>

      {open
        ? createPortal(
            <ul
              id={listId}
              role="listbox"
              data-anchored-ignore-outside="true"
              aria-labelledby={selectId}
              style={menuStyle}
              className="max-h-[280px] overflow-auto rounded-2xl border border-slate-200 bg-white py-1.5 shadow-lg"
            >
              {options.map((option) => {
                const isSelected = option.value === value
                return (
                  <li key={option.value} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      className="flex w-full items-start gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-slate-800 transition hover:bg-slate-50"
                      onClick={() => choose(option.value)}
                    >
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-slate-800">
                        {isSelected ? <CheckIcon /> : null}
                      </span>
                      <span className="min-w-0 whitespace-normal break-words">{option.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>,
            document.body
          )
        : null}
    </div>
  )
}

function ChevronIcon({ className = '' }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12.5l4.5 4.5L19 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
