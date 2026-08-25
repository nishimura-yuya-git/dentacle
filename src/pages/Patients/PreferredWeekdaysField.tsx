import { Button } from '@/components/ui/Button'
import { WEEKDAY_LABELS } from '@/utils/roleLabels'
import { PreferredWeekdayDayPanel } from '@/pages/Patients/PreferredWeekdayDayPanel'
import {
  applyAllDayUnavailable,
  createEmptyWindow,
  dayHasAllDayUnavailable,
  withAllDayUnavailable,
  type WeekdayTimeKind,
  type WeekdayTimeWindow,
} from '@/pages/Patients/weekdayUnavailable'

type Props = {
  weekdays: number[]
  windows: WeekdayTimeWindow[]
  disabled?: boolean
  onWeekdaysChange?: (next: number[]) => void
  onToggleWeekday?: (day: number) => void
  onWindowsChange: (next: WeekdayTimeWindow[]) => void
  onAddException?: () => void
}

function sortDays(days: number[]): number[] {
  return [...new Set(days)].filter((day) => day >= 0 && day <= 6).sort((a, b) => a - b)
}

export function PreferredWeekdaysField({
  weekdays,
  windows,
  disabled = false,
  onWeekdaysChange,
  onToggleWeekday,
  onWindowsChange,
  onAddException,
}: Props) {
  function isPreferred(day: number): boolean {
    return weekdays.includes(day) && !dayHasAllDayUnavailable(windows, day)
  }

  function emitWeekdays(next: number[]) {
    if (onWeekdaysChange) {
      onWeekdaysChange(next)
      return
    }
    const added = next.filter((day) => !weekdays.includes(day))
    const removed = weekdays.filter((day) => !next.includes(day))
    for (const day of [...removed, ...added]) onToggleWeekday?.(day)
  }

  function toggle(day: number) {
    if (isPreferred(day)) {
      emitWeekdays(sortDays(weekdays.filter((item) => item !== day)))
      return
    }
    if (dayHasAllDayUnavailable(windows, day)) {
      onWindowsChange(withAllDayUnavailable(windows, day, false))
    }
    emitWeekdays(sortDays([...weekdays, day]))
  }

  function patchWindow(clientId: string, patch: Partial<WeekdayTimeWindow>) {
    onWindowsChange(
      windows.map((row) => (row.clientId === clientId ? { ...row, ...patch } : row)),
    )
  }

  function addWindow(day: number, kind: WeekdayTimeKind) {
    onWindowsChange([...windows, createEmptyWindow(day, kind)])
  }

  function removeWindow(clientId: string) {
    onWindowsChange(windows.filter((row) => row.clientId !== clientId))
  }

  function setAllDay(day: number, enabled: boolean) {
    const next = applyAllDayUnavailable(windows, weekdays, day, enabled)
    onWindowsChange(next.windows)
    emitWeekdays(next.weekdays)
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-800">希望曜日</p>
        {onAddException ? (
          <Button
            type="button"
            variant="secondary"
            className="px-4 py-2 text-xs"
            disabled={disabled}
            onClick={onAddException}
          >
            例外を追加
          </Button>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {WEEKDAY_LABELS.map((label, day) => {
          const checked = isPreferred(day)
          return (
            <label
              key={day}
              className={[
                'relative inline-flex h-10 w-10 cursor-pointer select-none items-center justify-center rounded-full text-sm font-bold transition-colors',
                checked
                  ? 'border-2 border-solid border-[#008C01] bg-[#008C01]/10 text-[#008C01]'
                  : 'border-2 border-dotted border-slate-300 bg-white text-slate-600',
                disabled ? 'pointer-events-none opacity-60' : '',
              ].join(' ')}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(day)}
              />
              {label}
            </label>
          )
        })}
      </div>
      <p className="mt-2 text-xs font-medium text-slate-400">
        丸は行きたい曜日。いけない時間は希望にしていない曜日にも付けられます
      </p>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {WEEKDAY_LABELS.map((_, day) => (
          <PreferredWeekdayDayPanel
            key={day}
            day={day}
            preferred={isPreferred(day)}
            allDay={dayHasAllDayUnavailable(windows, day)}
            windows={windows.filter((row) => row.dayOfWeek === day)}
            disabled={disabled}
            onAllDayChange={(next) => setAllDay(day, next)}
            onPatch={patchWindow}
            onAdd={addWindow}
            onRemove={removeWindow}
          />
        ))}
      </div>
      <p className="mt-2 text-xs font-medium text-slate-400">
        希望時間を空欄のままにすると、上の希望開始・終了を使います
      </p>
    </div>
  )
}
