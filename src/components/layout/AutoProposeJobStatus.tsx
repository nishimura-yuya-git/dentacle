import { NavLink } from 'react-router-dom'
import { ComposingOrb } from '@/components/ui/ComposingOrb'
import { autoProposeStatusLabel } from '@/features/calendar/autoProposeJob'
import { useAutoProposeJob } from '@/features/calendar/useAutoProposeJob'

/**
 * ヘッダー右上の自動提案ステータス。
 * 他画面でも提案中／完了が見える。クリックでカレンダーへ戻る。
 */
export function AutoProposeJobStatus() {
  const job = useAutoProposeJob()
  const label = autoProposeStatusLabel(job.phase)
  if (!label) return null

  const toneClass =
    job.phase === 'success'
      ? 'text-[#008C01]'
      : job.phase === 'error'
        ? 'text-rose-600'
        : 'text-slate-700'

  return (
    <div role="status" aria-live="polite">
      <NavLink
        to="/calendar"
        className="inline-flex max-w-[11rem] items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 sm:max-w-none"
        aria-label={label}
      >
        {job.phase === 'running' ? <ComposingOrb size={20} label={label} /> : null}
        <span className={`truncate text-xs font-bold ${toneClass}`}>{label}</span>
      </NavLink>
    </div>
  )
}
