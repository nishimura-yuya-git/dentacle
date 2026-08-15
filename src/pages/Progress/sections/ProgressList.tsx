import { Select } from '@/components/ui/Select'
import {
  formatImprovementDate,
  formatImprovementEmptyCopy,
  formatImprovementPageLabel,
  PROGRESS_TABLE_COLUMNS,
} from '@/pages/Progress/formatImprovementItem'
import {
  IMPROVEMENT_STATUSES,
  IMPROVEMENT_STATUS_TONE_CLASS,
  IMPROVEMENT_STATUS_TONES,
  formatImprovementStatusLabel,
  isImprovementStatus,
  type ImprovementStatus,
} from '@/pages/Progress/improvementItemPolicy'
import type { ImprovementItemView } from '@/pages/Progress/improvementItemTypes'

const STATUS_OPTIONS = IMPROVEMENT_STATUSES.map((status) => ({
  value: status,
  label: formatImprovementStatusLabel(status),
}))

const TH =
  'whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-xs font-bold text-slate-600'

const TD = 'border-b border-slate-100 px-3 py-3 align-middle text-sm text-slate-700'

export function ProgressList({
  items,
  loading,
  busyId,
  onStatusChange,
}: {
  items: ImprovementItemView[]
  loading: boolean
  busyId: string | null
  onStatusChange: (id: string, status: ImprovementStatus) => void
}) {
  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <p className="text-sm text-slate-400">進捗を読み込んでいます…</p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center px-4">
        <p className="text-center text-sm font-medium leading-relaxed text-slate-400">
          {formatImprovementEmptyCopy()}
        </p>
      </div>
    )
  }

  return (
    <table className="min-w-[880px] w-full border-separate border-spacing-0 text-left text-sm">
      <thead className="sticky top-0 z-10 shadow-sm">
        <tr>
          {PROGRESS_TABLE_COLUMNS.map((column) => (
            <th key={column} className={TH}>
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {items.map((item, index) => {
          const tone = IMPROVEMENT_STATUS_TONES[item.status]
          const pageLabel = formatImprovementPageLabel(item.pagePath)
          const rowBg = index % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'
          return (
            <tr key={item.id} className={`${rowBg} hover:bg-emerald-50/40`}>
              <td className={`${TD} whitespace-nowrap text-slate-500`}>
                <time dateTime={item.createdAt}>{formatImprovementDate(item.createdAt)}</time>
              </td>
              <td className={TD}>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${IMPROVEMENT_STATUS_TONE_CLASS[tone]}`}
                >
                  {formatImprovementStatusLabel(item.status)}
                </span>
              </td>
              <td className={`${TD} min-w-[16rem]`}>
                <p className="font-bold text-slate-900">{item.title}</p>
                {item.summary && item.summary !== item.title ? (
                  <p className="mt-1 text-xs font-medium leading-relaxed text-slate-400">
                    {item.summary}
                  </p>
                ) : null}
                {item.productUpdateId ? (
                  <span className="mt-2 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-[#008C01]">
                    お知らせ掲載
                  </span>
                ) : null}
              </td>
              <td className={`${TD} whitespace-nowrap text-slate-600`}>{pageLabel ?? '—'}</td>
              <td className={`${TD} max-w-[12rem] truncate font-medium text-slate-800`}>
                {item.clinicName ?? '—'}
              </td>
              <td className={TD}>
                <div className="flex min-w-[10rem] flex-col gap-2">
                  <Select
                    name={`progress-status-${item.id}`}
                    size="sm"
                    options={STATUS_OPTIONS}
                    value={item.status}
                    disabled={busyId === item.id}
                    onChange={(event) => {
                      if (isImprovementStatus(event.target.value)) {
                        onStatusChange(item.id, event.target.value)
                      }
                    }}
                  />
                  {item.githubIssueUrl ? (
                    <a
                      href={item.githubIssueUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-xs font-bold text-[#008C01] underline-offset-2 hover:underline"
                    >
                      GitHubで開く
                    </a>
                  ) : null}
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
