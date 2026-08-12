import { DatePicker } from '@/components/ui/DatePicker'
import { Select } from '@/components/ui/Select'
import { AiUsageModelSwitcher } from '@/pages/Admin/sections/AiUsageModelSwitcher'
import {
  AiUsageTotals,
  type UsageTotals,
} from '@/pages/Admin/sections/AiUsageTotals'

type Props = {
  clinicOptions: Array<{ value: string; label: string }>
  clinicId: string
  onClinicChange: (clinicId: string) => void
  fromDate: string
  toDate: string
  onFromDateChange: (value: string) => void
  onToDateChange: (value: string) => void
  totals: UsageTotals
}

/** 見出し右端向け。クリニック・期間・合計（連絡リスト同様のポップオーバー）を1行に */
export function AiUsageFilters({
  clinicOptions,
  clinicId,
  onClinicChange,
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  totals,
}: Props) {
  return (
    <div className="flex flex-nowrap items-center justify-end gap-2 overflow-x-auto">
      <div className="inline-flex shrink-0 items-center gap-1.5">
        <label
          htmlFor="ai-usage-clinic-filter"
          className="shrink-0 text-xs font-bold text-slate-500"
        >
          クリニック
        </label>
        <div className="w-40">
          <Select
            id="ai-usage-clinic-filter"
            size="sm"
            options={clinicOptions}
            value={clinicId}
            onChange={(event) => onClinicChange(event.target.value)}
          />
        </div>
      </div>
      <DatePicker
        label="開始日"
        labelTone="muted"
        size="sm"
        inline
        value={fromDate}
        onChange={onFromDateChange}
        clearable
        placeholder="指定なし"
        className="shrink-0"
      />
      <DatePicker
        label="終了日"
        labelTone="muted"
        size="sm"
        inline
        value={toDate}
        onChange={onToDateChange}
        clearable
        placeholder="指定なし"
        className="shrink-0"
      />
      <AiUsageTotals totals={totals} />
      <AiUsageModelSwitcher />
    </div>
  )
}
