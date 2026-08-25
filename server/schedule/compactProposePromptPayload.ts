import { buildSparseTravelMinutesMatrix } from '../../src/utils/schedule/travelDistance.ts'
import type { ProposeJobSnapshot } from './types.ts'

const SPARSE_TOP_K = 8

/**
 * エージェント送信用にスナップショットを圧縮する。
 * - pretty-print しない
 * - 座標・null を落とす（距離は疎行列で渡す）
 * - travelMinutesMatrix は topK 近傍のみ
 */
export function compactProposePromptPayload(
  snapshot: ProposeJobSnapshot,
): Record<string, unknown> {
  const locations = snapshot.patients.map((patient) => ({
    patientId: patient.patientId,
    facilityId: patient.facilityId,
    areaLabel: patient.areaLabel,
    latitude: patient.latitude,
    longitude: patient.longitude,
  }))

  return {
    schemaVersion: snapshot.schemaVersion,
    targetDate: snapshot.targetDate,
    introductionLane: snapshot.introductionLane,
    dayStart: snapshot.dayStart,
    dayEnd: snapshot.dayEnd,
    maxSlots: snapshot.maxSlots,
    travelGapMinutes: snapshot.travelGapMinutes,
    teams: snapshot.teams.map((team) => ({
      index: team.index,
      name: team.name,
    })),
    patients: snapshot.patients.map((patient) => ({
      patientId: patient.patientId,
      areaLabel: patient.areaLabel,
      facilityId: patient.facilityId,
      preferredWeekdays: patient.preferredWeekdays,
      durationMinutes: patient.durationMinutes,
      requiresDoctor: patient.requiresDoctor,
      priority: patient.priority,
      dueStatus: patient.dueStatus,
      dueUrgencyDays: patient.dueUrgencyDays,
      visitFrequency: patient.visitFrequency,
    })),
    travelMinutesMatrix: buildSparseTravelMinutesMatrix(locations, SPARSE_TOP_K),
    occupiedVisits: (snapshot.occupiedVisits ?? []).map((row) => ({
      patientId: row.patientId,
      start: row.start,
      end: row.end,
      teamIndex: row.teamIndex,
    })),
  }
}
