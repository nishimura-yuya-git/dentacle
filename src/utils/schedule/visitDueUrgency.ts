/**
 * 訪問頻度・前回日・次回期限から、対象日時点の緊急度を算出する SSoT。
 * 画面ごと・エージェントごとで再実装しない。
 */

export type VisitFrequency =
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'custom'
  | 'unknown'

export type DueStatus = 'overdue' | 'due_soon' | 'scheduled' | 'unknown'

export type VisitDueInfo = {
  visitFrequency: VisitFrequency
  lastVisitDate: string | null
  nextDueDate: string | null
  /** 対象日 − 期限日（日）。正 = 期限超過 */
  dueUrgencyDays: number | null
  dueStatus: DueStatus
}

const INTERVAL_DAYS: Record<VisitFrequency, number | null> = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  custom: null,
  unknown: null,
}

/** この日数以内なら due_soon */
export const DUE_SOON_DAYS = 3

function parseISODate(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00`)
}

function daysBetween(fromISO: string, toISO: string): number {
  const from = parseISODate(fromISO).getTime()
  const to = parseISODate(toISO).getTime()
  return Math.round((to - from) / (24 * 60 * 60 * 1000))
}

function addDaysISO(iso: string, days: number): string {
  const date = parseISODate(iso)
  date.setDate(date.getDate() + days)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function normalizeVisitFrequency(value: unknown): VisitFrequency {
  if (
    value === 'weekly' ||
    value === 'biweekly' ||
    value === 'monthly' ||
    value === 'custom' ||
    value === 'unknown'
  ) {
    return value
  }
  return 'unknown'
}

function statusFromUrgency(days: number): DueStatus {
  if (days > 0) return 'overdue'
  if (days >= -DUE_SOON_DAYS) return 'due_soon'
  return 'scheduled'
}

/**
 * next_due_date があればそれを正とする。
 * 無ければ last_visit_date + 頻度間隔で仮の期限を作る。
 */
export function computeVisitDueInfo(input: {
  targetDate: string
  visitFrequency: unknown
  lastVisitDate: string | null | undefined
  nextDueDate: string | null | undefined
}): VisitDueInfo {
  const visitFrequency = normalizeVisitFrequency(input.visitFrequency)
  const lastVisitDate = input.lastVisitDate?.slice(0, 10) || null
  const explicitNext = input.nextDueDate?.slice(0, 10) || null

  if (explicitNext) {
    const dueUrgencyDays = daysBetween(explicitNext, input.targetDate)
    return {
      visitFrequency,
      lastVisitDate,
      nextDueDate: explicitNext,
      dueUrgencyDays,
      dueStatus: statusFromUrgency(dueUrgencyDays),
    }
  }

  const interval = INTERVAL_DAYS[visitFrequency]
  if (interval !== null && lastVisitDate) {
    const nextDueDate = addDaysISO(lastVisitDate, interval)
    const dueUrgencyDays = daysBetween(nextDueDate, input.targetDate)
    return {
      visitFrequency,
      lastVisitDate,
      nextDueDate,
      dueUrgencyDays,
      dueStatus: statusFromUrgency(dueUrgencyDays),
    }
  }

  return {
    visitFrequency,
    lastVisitDate,
    nextDueDate: null,
    dueUrgencyDays: null,
    dueStatus: 'unknown',
  }
}

/** 緊急度の高い順（overdue → due_soon → unknown → scheduled） */
export function compareDueUrgency(a: VisitDueInfo, b: VisitDueInfo): number {
  const rank: Record<DueStatus, number> = {
    overdue: 0,
    due_soon: 1,
    unknown: 2,
    scheduled: 3,
  }
  const rankDiff = rank[a.dueStatus] - rank[b.dueStatus]
  if (rankDiff !== 0) return rankDiff
  const ua = a.dueUrgencyDays ?? -9999
  const ub = b.dueUrgencyDays ?? -9999
  return ub - ua
}
