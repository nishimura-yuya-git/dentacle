/** 改善の進捗の状態（画面・テストの正）。DB の status と一致させる。 */

export const IMPROVEMENT_STATUSES = [
  'received',
  'reviewing',
  'in_progress',
  'done',
  'wont_fix',
] as const

export type ImprovementStatus = (typeof IMPROVEMENT_STATUSES)[number]

export const IMPROVEMENT_STATUS_LABELS: Record<ImprovementStatus, string> = {
  received: '受付',
  reviewing: '確認中',
  in_progress: '対応中',
  done: '反映済み',
  wont_fix: '見送り',
}

export type ImprovementStatusTone = 'attention' | 'info' | 'success' | 'muted'

export const IMPROVEMENT_STATUS_TONES: Record<ImprovementStatus, ImprovementStatusTone> = {
  received: 'attention',
  reviewing: 'attention',
  in_progress: 'info',
  done: 'success',
  wont_fix: 'muted',
}

export const IMPROVEMENT_STATUS_TONE_CLASS: Record<ImprovementStatusTone, string> = {
  attention: 'bg-orange-50 text-orange-600 border-orange-200',
  info: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  success: 'bg-emerald-50 text-[#008C01] border-emerald-200',
  muted: 'bg-slate-50 text-slate-400 border-slate-200',
}

export function isImprovementStatus(value: string): value is ImprovementStatus {
  return (IMPROVEMENT_STATUSES as readonly string[]).includes(value)
}

export function formatImprovementStatusLabel(status: ImprovementStatus): string {
  return IMPROVEMENT_STATUS_LABELS[status]
}

export type ImprovementStatusCounts = Record<ImprovementStatus, number>

export function countImprovementByStatus(
  items: Array<{ status: ImprovementStatus }>,
): ImprovementStatusCounts {
  const counts: ImprovementStatusCounts = {
    received: 0,
    reviewing: 0,
    in_progress: 0,
    done: 0,
    wont_fix: 0,
  }
  for (const item of items) {
    counts[item.status] += 1
  }
  return counts
}
