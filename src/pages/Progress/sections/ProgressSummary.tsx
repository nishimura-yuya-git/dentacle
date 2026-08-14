import {
  IMPROVEMENT_STATUS_TONE_CLASS,
  IMPROVEMENT_STATUS_TONES,
  countImprovementByStatus,
  formatImprovementStatusLabel,
  type ImprovementStatus,
} from '@/pages/Progress/improvementItemPolicy'
import type { ImprovementItemView } from '@/pages/Progress/improvementItemTypes'

const SUMMARY_KEYS: ImprovementStatus[] = ['received', 'reviewing', 'in_progress', 'done']

/** 見出し帯右端の件数。本文に大きなカードは置かない。 */
export function ProgressSummary({ items }: { items: ImprovementItemView[] }) {
  const counts = countImprovementByStatus(items)

  return (
    <ul className="flex flex-nowrap items-center gap-3 sm:gap-5" aria-label="進捗の件数">
      {SUMMARY_KEYS.map((status) => {
        const tone = IMPROVEMENT_STATUS_TONES[status]
        return (
          <li key={status} className="flex items-baseline gap-1.5">
            <span className="text-xs font-bold text-slate-400">
              {formatImprovementStatusLabel(status)}
            </span>
            <span className="text-lg font-black tabular-nums tracking-tight text-slate-900">
              {counts[status].toLocaleString('ja-JP')}
            </span>
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${IMPROVEMENT_STATUS_TONE_CLASS[tone]}`}
            >
              件
            </span>
          </li>
        )
      })}
    </ul>
  )
}
