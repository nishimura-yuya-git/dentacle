import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { TimePicker } from '@/components/ui/TimePicker'
import {
  weekdayLabelOf,
  type WeekdayTimeKind,
  type WeekdayTimeWindow,
} from '@/pages/Patients/weekdayUnavailable'

type Props = {
  day: number
  preferred: boolean
  allDay: boolean
  windows: WeekdayTimeWindow[]
  disabled?: boolean
  onAllDayChange: (next: boolean) => void
  onPatch: (clientId: string, patch: Partial<WeekdayTimeWindow>) => void
  onAdd: (day: number, kind: WeekdayTimeKind) => void
  onRemove: (clientId: string) => void
}

export function PreferredWeekdayDayPanel({
  day,
  preferred,
  allDay,
  windows,
  disabled = false,
  onAllDayChange,
  onPatch,
  onAdd,
  onRemove,
}: Props) {
  const preferredRows = windows.filter((row) => row.kind === 'preferred' && !row.allDay)
  const unavailableRows = windows.filter((row) => row.kind === 'unavailable' && !row.allDay)
  const showTimes = !allDay && (preferredRows.length > 0 || unavailableRows.length > 0)

  return (
    <div
      className={[
        'rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5',
        showTimes ? 'sm:col-span-2' : '',
      ].join(' ')}
    >
      {/* 追加ボタンが消えても行の高さを保つ。高さが縮むとチェック時に文字が上へ動く */}
      <div className="flex min-h-10 flex-wrap items-center gap-x-3 gap-y-2">
        <p className="w-10 shrink-0 select-none text-sm font-bold text-slate-900">
          {weekdayLabelOf(day)}曜
        </p>
        <Checkbox
          label="終日いけない"
          checked={allDay}
          disabled={disabled}
          onChange={onAllDayChange}
        />
        {allDay ? null : (
          <>
            {preferred ? (
              <Button
                type="button"
                variant="ghost"
                className="px-2.5 py-1.5 text-xs"
                disabled={disabled}
                onClick={() => onAdd(day, 'preferred')}
              >
                希望時間を追加
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              className="px-2.5 py-1.5 text-xs"
              disabled={disabled}
              onClick={() => onAdd(day, 'unavailable')}
            >
              いけない時間を追加
            </Button>
          </>
        )}
      </div>
      {showTimes ? (
        <div className="mt-2 space-y-2">
          {preferredRows.length > 0 ? (
            <TimeKindBlock
              title="希望時間"
              rows={preferredRows}
              disabled={disabled}
              onPatch={onPatch}
              onRemove={onRemove}
            />
          ) : null}
          {unavailableRows.length > 0 ? (
            <TimeKindBlock
              title="いけない時間"
              rows={unavailableRows}
              disabled={disabled}
              onPatch={onPatch}
              onRemove={onRemove}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function TimeKindBlock({
  title,
  rows,
  disabled,
  onPatch,
  onRemove,
}: {
  title: string
  rows: WeekdayTimeWindow[]
  disabled: boolean
  onPatch: (clientId: string, patch: Partial<WeekdayTimeWindow>) => void
  onRemove: (clientId: string) => void
}) {
  return (
    <div>
      <p className="text-[11px] font-bold text-slate-400">{title}</p>
      <div className="mt-1.5 space-y-1.5">
        {rows.map((row) => (
          <div key={row.clientId} className="flex flex-wrap items-end gap-2 rounded-xl bg-white px-2.5 py-2">
            <div className="w-[8.5rem]">
              <TimePicker
                label="開始"
                size="sm"
                labelTone="muted"
                value={row.start}
                disabled={disabled}
                minuteStep={5}
                onChange={(next) => onPatch(row.clientId, { start: next })}
              />
            </div>
            <span className="pb-1.5 text-xs font-bold text-slate-400">〜</span>
            <div className="w-[8.5rem]">
              <TimePicker
                label="終了"
                size="sm"
                labelTone="muted"
                value={row.end}
                disabled={disabled}
                minuteStep={5}
                onChange={(next) => onPatch(row.clientId, { end: next })}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              className="px-2.5 py-1.5 text-xs"
              disabled={disabled}
              onClick={() => onRemove(row.clientId)}
            >
              削除
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
