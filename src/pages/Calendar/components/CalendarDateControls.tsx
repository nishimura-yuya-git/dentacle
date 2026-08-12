import { Button } from '@/components/ui/Button'
import { DatePicker } from '@/components/ui/DatePicker'
import { CalendarDayMemo } from '@/pages/Calendar/components/CalendarDayMemo'
import { CancelListModal } from '@/pages/Calendar/components/CancelListModal'
import { ContactListModal } from '@/pages/Calendar/components/ContactListModal'
import {
  formatJapaneseDate,
  shiftDateISO,
} from '@/pages/Calendar/utils/calendarGrid'
import { todayISO } from '@/utils/dates'

type Props = {
  clinicId: string
  date: string
  onDateChange: (next: string) => void
  patientFilter: string
  onPatientFilterChange: (value: string) => void
  cancelledCount: number
  dayMemo: string
  memoSaving: boolean
  onMemoSave: (body: string) => boolean | void | Promise<boolean | void>
}

/** ヘッダー左側の日付ナビ＋患者絞り込み＋連絡者／キャンセル／日別メモ */
export function CalendarDateControls({
  clinicId,
  date,
  onDateChange,
  patientFilter,
  onPatientFilterChange,
  cancelledCount,
  dayMemo,
  memoSaving,
  onMemoSave,
}: Props) {
  return (
    <div
      className="flex shrink-0 flex-nowrap items-center gap-2"
      aria-label="日付と患者絞り込み"
    >
      <DatePicker
        label="日付"
        value={date}
        onChange={onDateChange}
        size="sm"
        labelTone="muted"
        inline
      />
      <p className="shrink-0 text-sm font-bold text-slate-900">
        {formatJapaneseDate(date)}
      </p>
      <Button
        variant="secondary"
        className="!rounded-md !px-2.5 !py-1.5 text-xs"
        aria-label="前の日"
        title="前の日"
        onClick={() => onDateChange(shiftDateISO(date, -1))}
      >
        ＜
      </Button>
      <Button
        variant="secondary"
        className="!rounded-md !px-3 !py-1.5 text-xs"
        onClick={() => onDateChange(todayISO())}
      >
        本日
      </Button>
      <Button
        variant="secondary"
        className="!rounded-md !px-2.5 !py-1.5 text-xs"
        aria-label="次の日"
        title="次の日"
        onClick={() => onDateChange(shiftDateISO(date, 1))}
      >
        ＞
      </Button>
      <label className="flex min-w-[8rem] max-w-[12rem] items-center">
        <span className="sr-only">患者絞り込み</span>
        <input
          type="text"
          value={patientFilter}
          onChange={(event) => onPatientFilterChange(event.target.value)}
          placeholder="患者名で絞り込み"
          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-[#008C01] focus:ring-2 focus:ring-[#008C01]/20"
        />
      </label>
      <ContactListModal clinicId={clinicId} date={date} />
      <CancelListModal
        clinicId={clinicId}
        date={date}
        cancelledCount={cancelledCount}
      />
      <CalendarDayMemo
        value={dayMemo}
        saving={memoSaving}
        onSave={onMemoSave}
      />
    </div>
  )
}
