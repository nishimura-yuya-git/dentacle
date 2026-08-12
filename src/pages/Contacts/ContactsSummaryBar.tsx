type Props = {
  visibleCount: number
  openCount: number
  pendingCount: number
  loading?: boolean
}

function formatCount(value: number): string {
  return value.toLocaleString('ja-JP')
}

/** 患者一覧と同型のサマリー帯（電話確認向け指標） */
export function ContactsSummaryBar({
  visibleCount,
  openCount,
  pendingCount,
  loading = false,
}: Props) {
  return (
    <div className="rounded-r-xl border border-amber-100 border-l-4 border-l-[#008C01] bg-[#FFF8E7] px-5 py-4">
      <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2 text-sm text-slate-700">
        <p>
          表示中 :{' '}
          <span className="text-base font-black tabular-nums text-slate-900">
            {loading ? '—' : formatCount(visibleCount)}
          </span>{' '}
          件
        </p>
        <p>
          未完了 :{' '}
          <span className="text-base font-black tabular-nums text-slate-900">
            {loading ? '—' : formatCount(openCount)}
          </span>{' '}
          件
        </p>
        <p>
          未確認 :{' '}
          <span className="text-base font-black tabular-nums text-slate-900">
            {loading ? '—' : formatCount(pendingCount)}
          </span>{' '}
          件
        </p>
      </div>
    </div>
  )
}
