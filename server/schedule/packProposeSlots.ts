import { timeToSeconds } from '../../src/utils/schedule/proposalLanePresets.ts'
import { freeWindowsForTeam } from './occupiedProposeSlots.ts'
import type { ProposeJobSnapshot, ProposeSlotResult } from './types.ts'

function secondsToTime(totalSec: number): string {
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function travelMinutesBetween(
  matrix: Record<string, Record<string, number>> | undefined,
  fromId: string | null,
  toId: string,
  fallbackGap: number,
): number {
  if (!fromId) return 0
  const value = matrix?.[fromId]?.[toId]
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(fallbackGap, Math.round(value))
  }
  return fallbackGap
}

function resolveTeamIndex(
  slot: ProposeSlotResult,
  teamCount: number,
): number {
  if (teamCount <= 0) return 0
  if (
    typeof slot.teamIndex === 'number' &&
    Number.isInteger(slot.teamIndex) &&
    slot.teamIndex >= 0 &&
    slot.teamIndex < teamCount
  ) {
    return slot.teamIndex
  }
  return 0
}

/**
 * 号車別ルートを維持したまま、各号車内だけ密に連続配置する（§6.8 / §6.48）。
 * - エージェントの teamIndex（並行ルート）を壊さない
 * - 号車内は開始時刻順を保ち、所要＋ travelMinutesMatrix で縦に詰める
 * - 1号車へのシリアル詰め・同時刻横並び禁止は行わない
 */
export function packProposeSlots(
  slots: ProposeSlotResult[],
  snapshot: ProposeJobSnapshot,
): ProposeSlotResult[] {
  if (slots.length === 0) return []
  if (snapshot.teams.length === 0) {
    return slots.map((slot) => ({ ...slot, teamIndex: 0 }))
  }

  const patientById = new Map(
    snapshot.patients.map((patient) => [patient.patientId, patient]),
  )
  const dayStartSec = timeToSeconds(snapshot.dayStart)
  const dayEndSec = timeToSeconds(snapshot.dayEnd)

  const byTeam = new Map<number, ProposeSlotResult[]>()
  for (const slot of slots) {
    const teamIndex = resolveTeamIndex(slot, snapshot.teams.length)
    const list = byTeam.get(teamIndex) ?? []
    list.push(slot)
    byTeam.set(teamIndex, list)
  }

  const packed: ProposeSlotResult[] = []

  for (const teamIndex of [...byTeam.keys()].sort((a, b) => a - b)) {
    const teamSlots = byTeam.get(teamIndex) ?? []
    const ordered = [...teamSlots].sort((a, b) => {
      const aSec = timeToSeconds(a.proposedStart)
      const bSec = timeToSeconds(b.proposedStart)
      if (aSec !== bSec) return aSec - bSec
      return a.patientId.localeCompare(b.patientId)
    })

    const windows = freeWindowsForTeam({
      dayStartSec,
      dayEndSec,
      occupied: snapshot.occupiedVisits,
      teamIndex,
      travelGapMinutes: snapshot.travelGapMinutes,
    })
    if (windows.length === 0) continue

    let windowIndex = 0
    let cursorSec = windows[0].startSec
    let lastPatientId: string | null = null
    const teamName =
      snapshot.teams[teamIndex]?.name ?? `${teamIndex + 1}号車`

    for (const slot of ordered) {
      const patient = patientById.get(slot.patientId)
      if (!patient) continue
      const durationSec = patient.durationMinutes * 60
      let placed = false

      while (windowIndex < windows.length) {
        const window = windows[windowIndex]
        const gapMin =
          lastPatientId === null
            ? 0
            : travelMinutesBetween(
                snapshot.travelMinutesMatrix,
                lastPatientId,
                slot.patientId,
                snapshot.travelGapMinutes,
              )
        const startSec = Math.max(
          window.startSec,
          lastPatientId === null ? window.startSec : cursorSec + gapMin * 60,
        )
        const endSec = startSec + durationSec
        if (startSec >= window.startSec && endSec <= window.endSec) {
          packed.push({
            ...slot,
            proposedStart: secondsToTime(startSec),
            proposedEnd: secondsToTime(endSec),
            teamIndex,
            reason: slot.reason?.trim() || `${teamName}に連続配置`,
          })
          cursorSec = endSec
          lastPatientId = slot.patientId
          placed = true
          break
        }

        windowIndex += 1
        lastPatientId = null
        if (windowIndex < windows.length) {
          cursorSec = windows[windowIndex].startSec
        }
      }

      if (!placed) {
        // 既存枠を避けた空き帯に入らない分は落とす（他号車へ勝手に移さない）
        continue
      }
    }
  }

  return packed.sort((a, b) => {
    const aSec = timeToSeconds(a.proposedStart)
    const bSec = timeToSeconds(b.proposedStart)
    if (aSec !== bSec) return aSec - bSec
    return (a.teamIndex ?? 0) - (b.teamIndex ?? 0)
  })
}
