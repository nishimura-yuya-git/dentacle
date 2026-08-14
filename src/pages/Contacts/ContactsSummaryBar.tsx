type Props = {
  visibleCount: number
  openCount: number
  pendingCount: number
  loading?: boolean
}

function formatCount(value: number): string {
  return value.toLocaleString('ja-JP')
}

/** 表直上の静かな件数行。未完了・未確認は検索で変えない。 */
export function ContactsSummaryBar({
  visibleCount,
  openCount,
  pendingCount,
  loading = false,
}: Props) {
  const visibleLabel = loading ? '—' : formatCount(visibleCount)
  const openLabel = loading ? '—' : formatCount(openCount)
  const pendingLabel = loading ? '—' : formatCount(pendingCount)

  return (
    <p className="text-sm font-bold text-slate-500">
      表示 {visibleLabel}件 ／ 未完了 {openLabel}件 ／ 未確認 {pendingLabel}件
    </p>
  )
}
