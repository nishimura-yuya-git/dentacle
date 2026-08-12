type Props = {
  totalPatients: number
  newPatientsThisMonth: number
  loading?: boolean
}

function formatCount(value: number): string {
  return value.toLocaleString('ja-JP')
}

/**
 * 見本どおりの患者件数サマリー帯（全件・今月新規）。
 */
export function PatientSummaryBar({
  totalPatients,
  newPatientsThisMonth,
  loading = false,
}: Props) {
  return (
    <div className="rounded-r-xl border border-amber-100 border-l-4 border-l-[#008C01] bg-[#FFF8E7] px-5 py-4">
      <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2 text-sm text-slate-700">
        <p>
          すべての患者 :{' '}
          <span className="text-base font-black tabular-nums text-slate-900">
            {loading ? '—' : formatCount(totalPatients)}
          </span>{' '}
          人
        </p>
        <p>
          今月の新規患者 :{' '}
          <span className="text-base font-black tabular-nums text-slate-900">
            {loading ? '—' : formatCount(newPatientsThisMonth)}
          </span>{' '}
          人
        </p>
      </div>
    </div>
  )
}
