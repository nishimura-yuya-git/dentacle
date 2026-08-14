import { Select } from '@/components/ui/Select'
import { OPERATION_PAGE_SIZE_OPTIONS } from '@/pages/Operations/formatOperationTrace'

type Props = {
  page: number
  totalPages: number
  pageSize: number
  totalCount: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

/** 右下: 表示件数切替 + 前後ページ。pr-20 はご意見FAB（bottom-5 right-5 h-14）との重なり回避。 */
export function OperationsTracesPagination({
  page,
  totalPages,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
}: Props) {
  if (totalCount === 0) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalCount)

  return (
    <div className="mt-3 flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-3 pr-20">
      <p className="text-xs font-medium text-slate-400">
        {from}–{to} / {totalCount}件
      </p>
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-bold text-slate-500">表示</span>
        <div className="w-[5.5rem]">
          <Select
            id="operations-page-size"
            size="sm"
            options={OPERATION_PAGE_SIZE_OPTIONS}
            value={String(pageSize)}
            onChange={(event) => {
              const next = Number(event.target.value)
              if (Number.isFinite(next) && next > 0) onPageSizeChange(next)
            }}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-500 transition hover:bg-slate-100 disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="前のページ"
        >
          ‹
        </button>
        <span className="flex h-9 min-w-9 items-center justify-center rounded-full bg-[#008C01] px-2 text-sm font-bold text-white">
          {page}
        </span>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-500 transition hover:bg-slate-100 disabled:opacity-40"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="次のページ"
        >
          ›
        </button>
      </div>
    </div>
  )
}
