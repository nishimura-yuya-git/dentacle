import { Select } from '@/components/ui/Select'
import {
  formatImprovementDate,
  formatImprovementPageLabel,
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

export function ProgressList({
  items,
  busyId,
  onStatusChange,
}: {
  items: ImprovementItemView[]
  busyId: string | null
  onStatusChange: (id: string, status: ImprovementStatus) => void
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm font-medium leading-relaxed text-slate-500">
        共有中の改善はまだありません。右下のご意見から送ると、ここに行ができます。
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const tone = IMPROVEMENT_STATUS_TONES[item.status]
        const pageLabel = formatImprovementPageLabel(item.pagePath)
        return (
          <article
            key={item.id}
            className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm"
          >
            <div className="flex flex-wrap items-center gap-2">
              <time className="text-sm text-slate-500" dateTime={item.createdAt}>
                {formatImprovementDate(item.createdAt)}
              </time>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${IMPROVEMENT_STATUS_TONE_CLASS[tone]}`}
              >
                {formatImprovementStatusLabel(item.status)}
              </span>
              {pageLabel ? (
                <span className="text-xs font-bold text-slate-400">{pageLabel}</span>
              ) : null}
              {item.clinicName ? (
                <span className="text-xs font-medium text-slate-400">{item.clinicName}</span>
              ) : null}
              {item.productUpdateId ? (
                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-[#008C01]">
                  お知らせ掲載
                </span>
              ) : null}
            </div>
            <h2 className="mt-3 text-base font-bold leading-relaxed text-slate-900">{item.title}</h2>
            {item.summary && item.summary !== item.title ? (
              <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-500">
                {item.summary}
              </p>
            ) : null}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <Select
                label="状態"
                size="sm"
                labelTone="muted"
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
                  className="text-sm font-bold text-[#007201]"
                >
                  GitHubで開く
                  <span aria-hidden="true"> →</span>
                </a>
              ) : null}
            </div>
          </article>
        )
      })}
    </div>
  )
}
