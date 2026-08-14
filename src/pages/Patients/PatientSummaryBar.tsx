type Props = {
  totalPatients: number
  newPatientsThisMonth: number
  visibleCount?: number
  searching?: boolean
  loading?: boolean
}

function formatCount(value: number): string {
  return value.toLocaleString('ja-JP')
}

/**
 * 表直上の静かな件数行。検索しても全患者数は変えない。
 */
export function PatientSummaryBar({
  totalPatients,
  newPatientsThisMonth,
  visibleCount = 0,
  searching = false,
  loading = false,
}: Props) {
  const totalLabel = loading ? '—' : formatCount(totalPatients)
  const newLabel = loading ? '—' : formatCount(newPatientsThisMonth)
  const visibleLabel = formatCount(visibleCount)

  return (
    <p className="text-sm font-bold text-slate-500">
      {totalLabel}人 ／ 今月新規 {newLabel}人
      {searching ? ` ／ 表示 ${visibleLabel}件` : ''}
    </p>
  )
}
