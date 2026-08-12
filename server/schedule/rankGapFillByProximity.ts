import { timeToSeconds } from '../../src/utils/schedule/proposalLanePresets.ts'
import { compareDueUrgency } from '../../src/utils/schedule/visitDueUrgency.ts'
import type {
  GapFillCandidate,
  GapFillExistingVisit,
  GapFillJobSnapshot,
  GapFillPatientSnapshot,
} from './types.ts'

function toHms(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec))
  const hh = Math.floor(sec / 3600)
  const mm = Math.floor((sec % 3600) / 60)
  const ss = sec % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

/**
 * 空き枠の直前・直後（同一号車）の既存訪問 patientId をアンカーにする。
 */
export function resolveGapFillAnchors(
  existingVisits: GapFillExistingVisit[],
  preferredTeamIndex: number,
  windowStart: string,
  windowEnd: string,
): string[] {
  const windowStartSec = timeToSeconds(windowStart)
  const windowEndSec = timeToSeconds(windowEnd)
  const teamVisits = existingVisits
    .filter((visit) => visit.teamIndex === preferredTeamIndex)
    .map((visit) => ({
      ...visit,
      startSec: timeToSeconds(visit.start),
      endSec: timeToSeconds(visit.end),
    }))
    .sort((a, b) => a.startSec - b.startSec)

  let prev: string | null = null
  let next: string | null = null
  for (const visit of teamVisits) {
    if (visit.endSec <= windowStartSec) prev = visit.patientId
    if (visit.startSec >= windowEndSec && !next) next = visit.patientId
  }

  const anchors = [prev, next].filter((id): id is string => Boolean(id))
  if (anchors.length > 0) return [...new Set(anchors)]

  // 前後が無い日は、同号車の既存訪問すべてを弱いアンカーにする
  return [...new Set(teamVisits.map((visit) => visit.patientId))]
}

/**
 * 候補患者ごとの最短移動分（アンカー基準）。
 * 行列に無い／アンカー無しは null。
 */
export function computeGapProximityMinutes(
  patientId: string,
  anchorPatientIds: string[],
  matrix: Record<string, Record<string, number>>,
): number | null {
  if (anchorPatientIds.length === 0) return null
  let best: number | null = null
  for (const anchorId of anchorPatientIds) {
    const minutes = matrix[patientId]?.[anchorId] ?? matrix[anchorId]?.[patientId]
    if (typeof minutes !== 'number' || !Number.isFinite(minutes)) continue
    if (best === null || minutes < best) best = minutes
  }
  return best
}

export function sortGapFillPatientsByProximity(
  patients: GapFillPatientSnapshot[],
): GapFillPatientSnapshot[] {
  return [...patients].sort((a, b) => {
    const pa = a.gapProximityMinutes
    const pb = b.gapProximityMinutes
    if (pa !== null && pb !== null && pa !== pb) return pa - pb
    if (pa !== null && pb === null) return -1
    if (pa === null && pb !== null) return 1
    const due = compareDueUrgency(a, b)
    if (due !== 0) return due
    return a.priority - b.priority
  })
}

/**
 * アプリ側 SSoT で近接優先の候補を組み立てる（生住所なし・距離行列のみ）。
 * 本当に無理な人（窓に収まらない等）は除外。条件外は warnings 付きで残す。
 */
export function buildGapFillCandidatesByProximity(
  snapshot: GapFillJobSnapshot,
): GapFillCandidate[] {
  const windowStartSec = timeToSeconds(snapshot.windowStart)
  const windowEndSec = timeToSeconds(snapshot.windowEnd)
  const windowMinutes = Math.round((windowEndSec - windowStartSec) / 60)
  if (windowMinutes < 15) return []

  const ranked = sortGapFillPatientsByProximity(snapshot.patients)
  const candidates: GapFillCandidate[] = []

  for (const patient of ranked) {
    if (candidates.length >= snapshot.maxSlots) break

    const slotMinutes = Math.min(patient.durationMinutes, windowMinutes)
    if (slotMinutes < 15) continue

    const proposedStart = snapshot.windowStart
    const proposedEnd = toHms(windowStartSec + slotMinutes * 60)
    if (timeToSeconds(proposedEnd) > windowEndSec) continue

    const warnings: string[] = []
    if (patient.durationMinutes > windowMinutes) {
      warnings.push('標準所要より短い枠での提案です')
    }
    if (patient.dueStatus === 'scheduled' || patient.dueStatus === 'unknown') {
      warnings.push('訪問期限は急ぎではありません')
    }
    if (
      patient.gapProximityMinutes !== null &&
      patient.gapProximityMinutes > 45
    ) {
      warnings.push('前後の訪問からの移動はやや長めです')
    }

    const proximityLabel =
      patient.gapProximityMinutes === null
        ? '近接アンカーなし'
        : patient.gapProximityMinutes <= 15
          ? `前後の訪問から約${patient.gapProximityMinutes}分（近い）`
          : `前後の訪問から約${patient.gapProximityMinutes}分`

    const area =
      patient.areaLabel?.trim() ||
      (patient.facilityId ? '同一施設候補' : 'エリア情報なし')

    candidates.push({
      patientId: patient.patientId,
      proposedStart,
      proposedEnd,
      teamIndex: snapshot.preferredTeamIndex,
      reason: `${proximityLabel} / ${area}`,
      warnings,
    })
  }

  return candidates
}
