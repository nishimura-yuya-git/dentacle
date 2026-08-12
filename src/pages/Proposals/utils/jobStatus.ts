export type JobStatusKey = 'succeeded' | 'running' | 'failed' | 'queued' | 'other'

export function resolveJobStatusKey(status: string): JobStatusKey {
  if (status === 'succeeded' || status === 'completed' || status === 'done') {
    return 'succeeded'
  }
  if (status === 'running' || status === 'processing' || status === 'pending') {
    return 'running'
  }
  if (status === 'failed' || status === 'error') {
    return 'failed'
  }
  if (status === 'queued') return 'queued'
  return 'other'
}

export const JOB_STATUS_LABEL: Record<JobStatusKey, string> = {
  succeeded: '完了',
  running: '処理中',
  failed: '失敗',
  queued: '待機中',
  other: 'その他',
}

export const JOB_STATUS_BADGE_CLASS: Record<JobStatusKey, string> = {
  succeeded: 'border-sky-200 bg-sky-50 text-sky-700',
  running: 'border-amber-200 bg-amber-50 text-amber-700',
  failed: 'border-rose-200 bg-rose-50 text-rose-700',
  queued: 'border-slate-200 bg-slate-50 text-slate-600',
  other: 'border-slate-200 bg-slate-50 text-slate-600',
}

export function formatJobDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${y}/${m}/${d} ${hh}:${mm}`
}

export function formatJobDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-')
  if (!y || !m || !d) return isoDate
  return `${y}/${m}/${d}`
}
