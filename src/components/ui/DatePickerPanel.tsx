import type { CSSProperties } from 'react'
import {
  WEEKDAY_LABELS,
  buildMonthCells,
  formatMonthTitle,
  shiftMonth,
  toISODate,
} from '@/components/ui/datePickerUtils'
import { todayISO } from '@/utils/dates'

type Props = {
  panelId: string
  style: CSSProperties
  value: string
  cursorYear: number
  cursorMonth: number
  clearable: boolean
  onCursorChange: (year: number, monthIndex: number) => void
  onChoose: (iso: string) => void
  onClear: () => void
}

/** 日付ピッカーの月カレンダー本体（portal 内） */
export function DatePickerPanel({
  panelId,
  style,
  value,
  cursorYear,
  cursorMonth,
  clearable,
  onCursorChange,
  onChoose,
  onClear,
}: Props) {
  const cells = buildMonthCells(cursorYear, cursorMonth)
  const today = todayISO()

  function moveMonth(delta: number) {
    const next = shiftMonth(cursorYear, cursorMonth, delta)
    onCursorChange(next.year, next.monthIndex)
  }

  return (
    <div
      id={panelId}
      role="dialog"
      aria-label="日付を選択"
      data-anchored-ignore-outside="true"
      style={style}
      className="rounded-2xl border border-slate-200 bg-white p-3 shadow-lg"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-50"
          aria-label="前の月"
          onClick={() => moveMonth(-1)}
        >
          <ChevronIcon direction="left" />
        </button>
        <p className="text-sm font-bold text-slate-900">
          {formatMonthTitle(cursorYear, cursorMonth)}
        </p>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-50"
          aria-label="次の月"
          onClick={() => moveMonth(1)}
        >
          <ChevronIcon direction="right" />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-0.5">
        {WEEKDAY_LABELS.map((labelText, index) => (
          <div
            key={labelText}
            className={[
              'py-1 text-center text-[11px] font-bold',
              index === 0
                ? 'text-rose-500'
                : index === 6
                  ? 'text-sky-600'
                  : 'text-slate-400',
            ].join(' ')}
          >
            {labelText}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((cell) => {
          const selected = cell.iso === value
          const isToday = cell.iso === today
          return (
            <button
              key={cell.iso}
              type="button"
              className={[
                'flex h-9 items-center justify-center rounded-lg text-sm font-bold transition',
                selected
                  ? 'bg-[#008C01] text-white'
                  : isToday
                    ? 'bg-[#008C01]/10 text-[#008C01]'
                    : cell.inMonth
                      ? 'text-slate-800 hover:bg-slate-50'
                      : 'text-slate-300 hover:bg-slate-50',
              ].join(' ')}
              onClick={() => onChoose(cell.iso)}
            >
              {cell.day}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
        {clearable ? (
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-xs font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            onClick={onClear}
          >
            クリア
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          className="rounded-lg px-2 py-1 text-xs font-bold text-[#008C01] transition hover:bg-[#008C01]/10"
          onClick={() => onChoose(toISODate(new Date()))}
        >
          本日
        </button>
      </div>
    </div>
  )
}

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d={direction === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function CalendarGlyph({ className = '' }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 9h18" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
