import { Button } from '@/components/ui/Button'
import { Select, type SelectOption } from '@/components/ui/Select'
import type { JobRow } from '@/pages/Proposals/types'
import { shouldShowRecentJobsClinicColumn } from '@/pages/Proposals/utils/filterRecentJobs'
import {
  JOB_STATUS_BADGE_CLASS,
  JOB_STATUS_LABEL,
  formatJobDate,
  formatJobDateTime,
  resolveJobStatusKey,
} from '@/pages/Proposals/utils/jobStatus'

type Props = {
  jobs: JobRow[]
  loading: boolean
  selectedJobId: string | null
  canPropose: boolean
  busy: boolean
  clinicFilter: string
  clinicOptions: SelectOption[]
  onClinicFilterChange: (clinicId: string) => void
  onRerun: (job: JobRow) => void
}

const TH =
  'whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-xs font-bold text-slate-600'
const TD = 'border-b border-slate-100 px-3 py-3 align-middle text-sm text-slate-700'

/** 最近の提案ジョブ（表 + sticky 見出し + クリニック絞り込み） */
export function RecentJobsSection({
  jobs,
  loading,
  selectedJobId,
  canPropose,
  busy,
  clinicFilter,
  clinicOptions,
  onClinicFilterChange,
  onRerun,
}: Props) {
  const showClinicColumn = shouldShowRecentJobsClinicColumn(clinicFilter)

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm font-bold text-slate-500">{jobs.length}件</p>
        <div className="w-[11rem]">
          <Select
            id="recent-jobs-clinic-filter"
            label="クリニック"
            labelTone="muted"
            size="sm"
            options={clinicOptions}
            value={clinicFilter}
            onChange={(event) => onClinicFilterChange(event.target.value)}
          />
        </div>
      </div>

      <div className="mt-4 max-h-[min(28rem,60vh)] overflow-auto rounded-2xl border border-slate-200 bg-white">
        {loading ? (
          <div className="flex min-h-[8rem] items-center justify-center">
            <p className="text-sm text-slate-400">履歴を読み込んでいます…</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex min-h-[8rem] items-center justify-center px-4">
            <p className="text-center text-sm text-slate-400">
              該当する提案ジョブがありません。条件を変えるか、条件設定から生成してください。
            </p>
          </div>
        ) : (
          <table className="min-w-[920px] w-full border-separate border-spacing-0 text-left text-sm">
            <thead className="sticky top-0 z-10 shadow-sm">
              <tr>
                <th className={TH}>実行日時</th>
                {showClinicColumn ? <th className={TH}>クリニック</th> : null}
                <th className={TH}>対象日</th>
                <th className={TH}>チーム</th>
                <th className={TH}>状態</th>
                <th className={TH}>件数</th>
                <th className={TH}>操作</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job, index) => {
                const statusKey = resolveJobStatusKey(job.status)
                const selected = selectedJobId === job.id
                const slotCount = job.result_snapshot?.slotCount
                const rowBg = selected
                  ? 'bg-[#008C01]/5'
                  : index % 2 === 0
                    ? 'bg-white'
                    : 'bg-slate-50/80'
                return (
                  <tr key={job.id} className={`${rowBg} hover:bg-emerald-50/40`}>
                    <td className={`${TD} whitespace-nowrap font-medium`}>
                      {formatJobDateTime(job.created_at)}
                    </td>
                    {showClinicColumn ? (
                      <td className={`${TD} whitespace-nowrap font-bold text-slate-800`}>
                        {job.clinicName}
                      </td>
                    ) : null}
                    <td className={`${TD} whitespace-nowrap`}>
                      {formatJobDate(job.target_date)}
                    </td>
                    <td className={`${TD} whitespace-nowrap`}>
                      {job.teamName ?? '指定なし'}
                    </td>
                    <td className={TD}>
                      <span
                        className={[
                          'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold',
                          JOB_STATUS_BADGE_CLASS[statusKey],
                        ].join(' ')}
                      >
                        {JOB_STATUS_LABEL[statusKey]}
                      </span>
                    </td>
                    <td className={`${TD} whitespace-nowrap`}>
                      {typeof slotCount === 'number' ? `${slotCount}件` : '—'}
                    </td>
                    <td className={TD}>
                      <Button
                        variant="secondary"
                        className="!rounded-lg !px-3 !py-1.5 text-xs"
                        disabled={!canPropose || busy}
                        onClick={() => onRerun(job)}
                      >
                        再利用
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
