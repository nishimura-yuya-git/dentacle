import { timeToSeconds } from '../../src/utils/schedule/proposalLanePresets.ts'
import { packProposeSlots } from './packProposeSlots.ts'
import type { ProposeJobSnapshot, ProposeSlotResult } from './types.ts'

function clusterKey(patient: {
  facilityId: string | null
  areaLabel: string | null
}): string {
  if (patient.facilityId) return `f:${patient.facilityId}`
  const area = patient.areaLabel?.trim()
  if (area) return `a:${area}`
  return 'other'
}

function travelOf(
  matrix: Record<string, Record<string, number>> | undefined,
  fromId: string | null,
  toId: string,
  fallback: number,
): number {
  if (!fromId) return 0
  const value = matrix?.[fromId]?.[toId]
  if (typeof value === 'number' && Number.isFinite(value)) return value
  return fallback
}

/** 号車内を nearest-neighbor で並べる（エージェントなしのルート近似） */
function orderByNearestNeighbor(
  patientIds: string[],
  matrix: ProposeJobSnapshot['travelMinutesMatrix'],
  fallbackGap: number,
): string[] {
  if (patientIds.length <= 1) return [...patientIds]
  const remaining = new Set(patientIds)
  // 緊急度順の先頭を起点（呼び出し側で patients は既にソート済み）
  const start = patientIds[0]
  const ordered = [start]
  remaining.delete(start)
  let current = start

  while (remaining.size > 0) {
    let bestId: string | null = null
    let bestCost = Number.POSITIVE_INFINITY
    for (const id of remaining) {
      const cost = travelOf(matrix, current, id, fallbackGap)
      if (cost < bestCost || (cost === bestCost && id.localeCompare(bestId ?? '') < 0)) {
        bestCost = cost
        bestId = id
      }
    }
    if (!bestId) break
    ordered.push(bestId)
    remaining.delete(bestId)
    current = bestId
  }
  return ordered
}

function estimateCarsNeeded(snapshot: ProposeJobSnapshot, slotCount: number): number {
  const teamCount = snapshot.teams.length
  if (teamCount <= 0) return 0
  if (slotCount <= 0) return 0

  const dayMinutes = Math.max(
    30,
    (timeToSeconds(snapshot.dayEnd) - timeToSeconds(snapshot.dayStart)) / 60,
  )
  const avgDuration =
    snapshot.patients.reduce((sum, p) => sum + p.durationMinutes, 0) /
      Math.max(1, snapshot.patients.length) || 30
  // 稼働帯から見た1台上限（詰め込みすぎ防止）
  const hardCapPerCar = Math.max(
    3,
    Math.floor(dayMinutes / (avgDuration + snapshot.travelGapMinutes)),
  )
  // 実運用は朝から複数台並行（§6.48）。1台あたりの目安件数で台数を決める
  const softCapPerCar = Math.min(hardCapPerCar, 6)
  let cars = Math.min(teamCount, Math.max(1, Math.ceil(slotCount / softCapPerCar)))
  if (slotCount >= 4 && teamCount >= 2) cars = Math.max(cars, 2)
  if (slotCount >= 10 && teamCount >= 3) cars = Math.max(cars, 3)
  return Math.min(teamCount, cars)
}

/**
 * Cursor SDK なしの決定論割付（§6.8 / §6.48）。
 * エリア／施設束 → 必要台数の並行号車 → 号車内 NN → packProposeSlots で密連続。
 * カレンダー主導線の速度優先エンジン。
 */
export function buildLocalProposeSlots(
  snapshot: ProposeJobSnapshot,
): ProposeSlotResult[] {
  if (snapshot.patients.length === 0 || snapshot.teams.length === 0) return []

  const targetSlots = Math.min(snapshot.maxSlots, snapshot.patients.length)
  const selected = snapshot.patients.slice(0, targetSlots)
  const carsNeeded = estimateCarsNeeded(snapshot, selected.length)
  if (carsNeeded <= 0) return []

  const clusters = new Map<string, typeof selected>()
  for (const patient of selected) {
    const key = clusterKey(patient)
    const list = clusters.get(key) ?? []
    list.push(patient)
    clusters.set(key, list)
  }

  // 大きい束から号車へラウンドロビン割当（平準化）
  const clusterList = [...clusters.entries()].sort(
    (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]),
  )
  const teamBuckets: string[][] = Array.from({ length: carsNeeded }, () => [])
  const teamLoad = Array.from({ length: carsNeeded }, () => 0)

  for (const [, members] of clusterList) {
    let bestTeam = 0
    for (let i = 1; i < carsNeeded; i += 1) {
      if (teamLoad[i] < teamLoad[bestTeam]) bestTeam = i
    }
    for (const member of members) {
      teamBuckets[bestTeam].push(member.patientId)
      teamLoad[bestTeam] += 1
    }
  }

  const draft: ProposeSlotResult[] = []
  for (let teamIndex = 0; teamIndex < carsNeeded; teamIndex += 1) {
    const orderedIds = orderByNearestNeighbor(
      teamBuckets[teamIndex],
      snapshot.travelMinutesMatrix,
      snapshot.travelGapMinutes,
    )
    for (const patientId of orderedIds) {
      draft.push({
        patientId,
        proposedStart: snapshot.dayStart,
        proposedEnd: snapshot.dayStart,
        teamIndex,
        reason: 'エリア束の並行ルート（ローカル割付）',
      })
    }
  }

  return packProposeSlots(draft, snapshot)
}
