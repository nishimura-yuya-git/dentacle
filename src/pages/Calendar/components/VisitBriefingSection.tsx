import { Select } from '@/components/ui/Select'
import {
  INFECTIOUS_DISEASE_HINT,
  INFECTIOUS_DISEASE_LABEL,
} from '@/pages/Patients/infectiousDiseasePolicy'
import { visitStatusLabel } from '@/utils/roleLabels'

type Option = { value: string; label: string }

type Props = {
  loading: boolean
  status: string
  staffId: string
  staffOptions: Option[]
  address: string
  phone: string
  previousLabel: string
  weekdayLabel: string
  timeRangeLabel: string | null
  constraintLines: string[]
  hasInfectiousDisease: boolean
  onChangeStaff: (value: string) => void
}

function BriefingItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-800">{value}</p>
    </div>
  )
}

export function VisitBriefingSection({
  loading,
  status,
  staffId,
  staffOptions,
  address,
  phone,
  previousLabel,
  weekdayLabel,
  timeRangeLabel,
  constraintLines,
  hasInfectiousDisease,
  onChangeStaff,
}: Props) {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50 p-5">
      {hasInfectiousDisease ? (
        <div className="rounded-2xl bg-slate-800 px-4 py-3 text-slate-50">
          <p className="text-sm font-bold">{INFECTIOUS_DISEASE_LABEL}</p>
          <p className="mt-1 text-xs font-medium text-slate-300">{INFECTIOUS_DISEASE_HINT}</p>
        </div>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">今日の訪問</h3>
          <p className="mt-1 text-xs font-medium text-slate-500">
            {loading ? '患者情報を読み込んでいます' : `状態: ${visitStatusLabel(status)}`}
          </p>
        </div>
        <div className="min-w-[12rem] flex-1 sm:max-w-xs">
          <Select
            label="担当スタッフ"
            value={staffId}
            onChange={(event) => onChangeStaff(event.target.value)}
            options={staffOptions}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <BriefingItem label="住所" value={address} />
        <BriefingItem label="電話" value={phone} />
        <div className="sm:col-span-2">
          <BriefingItem label="前回" value={previousLabel} />
        </div>
        <BriefingItem
          label="希望"
          value={timeRangeLabel ? `${weekdayLabel} ${timeRangeLabel}` : weekdayLabel}
        />
        <div>
          <p className="text-xs font-bold text-slate-400">都合</p>
          {constraintLines.length === 0 ? (
            <p className="mt-1 text-sm font-medium text-slate-800">登録された都合はありません</p>
          ) : (
            <ul className="mt-1 space-y-1 text-sm font-medium text-slate-800">
              {constraintLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
