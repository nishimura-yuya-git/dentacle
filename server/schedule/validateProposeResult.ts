import { timeToSeconds } from '../../src/utils/schedule/proposalLanePresets.ts'
import { slotOverlapsOccupied } from './occupiedProposeSlots.ts'
import type {
  ProposeAgentResult,
  ProposeJobSnapshot,
  ProposeSlotResult,
} from './types.ts'

export type AccuracyIssueCode =
  | 'outside_day_window'
  | 'duration_mismatch'
  | 'team_overlap'
  | 'occupied_overlap'
  | 'travel_gap'
  | 'travel_jump'
  | 'preferred_weekday'

/** 連続訪問でこの分数を超える移動は warn（行列がある場合のみ） */
const TRAVEL_JUMP_WARN_MINUTES = 45

export type AccuracyIssue = {
  code: AccuracyIssueCode
  severity: 'hard' | 'warn'
  patientId: string
  message: string
}

export type ProposeAccuracyReport = {
  parsedCount: number
  acceptedCount: number
  hardDroppedCount: number
  warnCount: number
  dropRate: number
  issues: AccuracyIssue[]
  /** hard 落ち後に apply してよいスロット */
  acceptedSlots: ProposeSlotResult[]
}

function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00`).getDay()
}

function resolveTeamIndex(
  slot: ProposeSlotResult,
  sequenceIndex: number,
  teamCount: number,
): number {
  if (teamCount <= 0) return 0
  if (
    typeof slot.teamIndex === 'number' &&
    slot.teamIndex >= 0 &&
    slot.teamIndex < teamCount
  ) {
    return slot.teamIndex
  }
  // 未指定時は1号車へ寄せる（横展開のラウンドロビンはしない）
  void sequenceIndex
  return 0
}

function durationMinutesOf(start: string, end: string): number {
  return Math.round((timeToSeconds(end) - timeToSeconds(start)) / 60)
}

/**
 * パース後・apply 前の決定論精度ゲート。
 * hard: 稼働帯 / 所要時間 / 同一号車重複 / 既存枠重複 → スロット除外
 * warn: 移動ギャップ / 距離ジャンプ / 希望曜日 → 記録のみ（初版は採用継続）
 */
export function validateProposeResult(
  result: ProposeAgentResult,
  snapshot: ProposeJobSnapshot,
): ProposeAccuracyReport {
  const issues: AccuracyIssue[] = []
  const dayStartSec = timeToSeconds(snapshot.dayStart)
  const dayEndSec = timeToSeconds(snapshot.dayEnd)
  const patientById = new Map(
    snapshot.patients.map((patient) => [patient.patientId, patient]),
  )
  const weekday = weekdayOf(snapshot.targetDate)
  const matrix = snapshot.travelMinutesMatrix ?? {}

  type Candidate = {
    slot: ProposeSlotResult
    teamIndex: number
    startSec: number
    endSec: number
  }

  const candidates: Candidate[] = []

  result.slots.forEach((slot, index) => {
    const patient = patientById.get(slot.patientId)
    if (!patient) {
      issues.push({
        code: 'duration_mismatch',
        severity: 'hard',
        patientId: slot.patientId,
        message: 'スナップショットに患者がいません',
      })
      return
    }

    const startSec = timeToSeconds(slot.proposedStart)
    const endSec = timeToSeconds(slot.proposedEnd)
    if (startSec < dayStartSec || endSec > dayEndSec) {
      issues.push({
        code: 'outside_day_window',
        severity: 'hard',
        patientId: slot.patientId,
        message: `稼働帯外（${slot.proposedStart}–${slot.proposedEnd} / ${snapshot.dayStart}–${snapshot.dayEnd}）`,
      })
      return
    }

    const actualMinutes = durationMinutesOf(slot.proposedStart, slot.proposedEnd)
    if (actualMinutes !== patient.durationMinutes) {
      issues.push({
        code: 'duration_mismatch',
        severity: 'hard',
        patientId: slot.patientId,
        message: `所要時間が不一致（案 ${actualMinutes}分 / 条件 ${patient.durationMinutes}分）`,
      })
      return
    }

    if (
      patient.preferredWeekdays.length > 0 &&
      !patient.preferredWeekdays.includes(weekday)
    ) {
      issues.push({
        code: 'preferred_weekday',
        severity: 'warn',
        patientId: slot.patientId,
        message: `希望曜日外（対象曜日 ${weekday}）`,
      })
    }

    const teamIndex = resolveTeamIndex(slot, index, snapshot.teams.length)
    if (
      slotOverlapsOccupied({
        teamIndex,
        start: slot.proposedStart,
        end: slot.proposedEnd,
        occupied: snapshot.occupiedVisits,
      })
    ) {
      issues.push({
        code: 'occupied_overlap',
        severity: 'hard',
        patientId: slot.patientId,
        message: `既存の確定枠と時間重複（teamIndex ${teamIndex}）`,
      })
      return
    }

    candidates.push({
      slot,
      teamIndex,
      startSec,
      endSec,
    })
  })

  // 同一号車の重複（開始順に見て重なる後続を hard drop）
  const byTeam = new Map<number, Candidate[]>()
  for (const candidate of candidates) {
    const list = byTeam.get(candidate.teamIndex) ?? []
    list.push(candidate)
    byTeam.set(candidate.teamIndex, list)
  }

  const accepted: Candidate[] = []
  for (const [, list] of byTeam) {
    list.sort((a, b) => a.startSec - b.startSec || a.endSec - b.endSec)
    let lastAccepted: Candidate | null = null
    for (const candidate of list) {
      if (lastAccepted && candidate.startSec < lastAccepted.endSec) {
        issues.push({
          code: 'team_overlap',
          severity: 'hard',
          patientId: candidate.slot.patientId,
          message: `同一号車で時間重複（teamIndex ${candidate.teamIndex}）`,
        })
        continue
      }

      if (lastAccepted) {
        const gapMinutes = Math.round(
          (candidate.startSec - lastAccepted.endSec) / 60,
        )
        if (gapMinutes < snapshot.travelGapMinutes) {
          issues.push({
            code: 'travel_gap',
            severity: 'warn',
            patientId: candidate.slot.patientId,
            message: `移動ギャップ不足（${gapMinutes}分 < ${snapshot.travelGapMinutes}分）`,
          })
        }

        const fromId = lastAccepted.slot.patientId
        const toId = candidate.slot.patientId
        const travelMinutes = matrix[fromId]?.[toId]
        if (
          typeof travelMinutes === 'number' &&
          travelMinutes > TRAVEL_JUMP_WARN_MINUTES
        ) {
          issues.push({
            code: 'travel_jump',
            severity: 'warn',
            patientId: candidate.slot.patientId,
            message: `距離ジャンプが大きい（移動目安 ${travelMinutes}分 > ${TRAVEL_JUMP_WARN_MINUTES}分）`,
          })
        }
      }

      accepted.push(candidate)
      lastAccepted = candidate
    }
  }

  accepted.sort(
    (a, b) => a.startSec - b.startSec || a.teamIndex - b.teamIndex,
  )

  const hardDroppedCount = issues.filter((i) => i.severity === 'hard').length
  const warnCount = issues.filter((i) => i.severity === 'warn').length
  const parsedCount = result.slots.length
  const acceptedCount = accepted.length
  const dropRate = parsedCount === 0 ? 0 : hardDroppedCount / parsedCount

  return {
    parsedCount,
    acceptedCount,
    hardDroppedCount,
    warnCount,
    dropRate,
    issues,
    acceptedSlots: accepted.map((row) => row.slot),
  }
}

/** apply してよい状態か。残スロット0、または棄却率が高すぎる場合は停止 */
export function shouldStopForAccuracy(report: ProposeAccuracyReport): {
  stop: boolean
  reason?: string
} {
  if (report.acceptedCount === 0) {
    return {
      stop: true,
      reason: '精度ゲートにより採用可能な割付が0件になりました',
    }
  }
  if (report.dropRate > 0.7) {
    return {
      stop: true,
      reason: `精度ゲートの棄却率が高すぎます（${Math.round(report.dropRate * 100)}%）`,
    }
  }
  return { stop: false }
}

export function toAccuracySnapshot(report: ProposeAccuracyReport): {
  parsedCount: number
  acceptedCount: number
  hardDroppedCount: number
  warnCount: number
  dropRate: number
  issues: AccuracyIssue[]
} {
  return {
    parsedCount: report.parsedCount,
    acceptedCount: report.acceptedCount,
    hardDroppedCount: report.hardDroppedCount,
    warnCount: report.warnCount,
    dropRate: report.dropRate,
    issues: report.issues.slice(0, 50),
  }
}
