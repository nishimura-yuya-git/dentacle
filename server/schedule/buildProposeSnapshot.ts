import type { SupabaseClient } from '@supabase/supabase-js'
import {
  DEFAULT_INTRODUCTION_LANE,
  getProposalLanePreset,
  isIntroductionLane,
  type IntroductionLane,
} from '../../src/utils/schedule/proposalLanePresets.ts'
import {
  buildTravelMinutesMatrix,
  hasUsableAddress,
  type TravelLocation,
} from '../../src/utils/schedule/travelDistance.ts'
import {
  compareDueUrgency,
  computeVisitDueInfo,
} from '../../src/utils/schedule/visitDueUrgency.ts'
import { normalizeOccupiedHms } from './occupiedProposeSlots.ts'
import type {
  OccupiedVisit,
  ProposeJobSnapshot,
  ProposePatientSnapshot,
} from './types.ts'

function readIntroductionLane(metadata: unknown): IntroductionLane {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return DEFAULT_INTRODUCTION_LANE
  }
  const lane = (metadata as Record<string, unknown>).introduction_lane
  return isIntroductionLane(lane) ? lane : DEFAULT_INTRODUCTION_LANE
}

function asCoord(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

/**
 * アプリ側で割付ジョブ入力スナップショットを組み立てる。
 * 住所必須・距離行列・頻度/期限を載せ、生住所はエージェントに渡さない（§6.12 / §6.16）。
 */
export async function buildProposeSnapshot(input: {
  supabase: SupabaseClient
  clinicId: string
  targetDate: string
  vehicleTeamIds: string[]
}): Promise<ProposeJobSnapshot> {
  const teamIds = input.vehicleTeamIds.filter(Boolean)

  const [patientsRes, conditionsRes, clinicRes, visitsRes, teamsRes, facilitiesRes] =
    await Promise.all([
      input.supabase
        .from('patients')
        .select('id, area_label, facility_id, address, latitude, longitude')
        .eq('clinic_id', input.clinicId)
        .eq('is_active', true)
        .is('deleted_at', null),
      input.supabase
        .from('patient_visit_conditions')
        .select(
          'patient_id, preferred_weekdays, standard_duration_minutes, requires_doctor, priority, phone_confirmation_required, visit_frequency, last_visit_date, next_due_date',
        )
        .eq('clinic_id', input.clinicId)
        .is('deleted_at', null),
      input.supabase
        .from('clinics')
        .select('metadata')
        .eq('id', input.clinicId)
        .is('deleted_at', null)
        .maybeSingle(),
      input.supabase
        .from('visits')
        .select('patient_id, start_time, end_time, team_id')
        .eq('clinic_id', input.clinicId)
        .eq('scheduled_date', input.targetDate)
        .neq('status', 'cancelled')
        .is('deleted_at', null),
      teamIds.length > 0
        ? input.supabase
            .from('teams')
            .select('id, name')
            .eq('clinic_id', input.clinicId)
            .in('id', teamIds)
            .is('deleted_at', null)
        : Promise.resolve({ data: [] as { id: string; name: string }[], error: null }),
      input.supabase
        .from('facilities')
        .select('id, latitude, longitude')
        .eq('clinic_id', input.clinicId)
        .is('deleted_at', null),
    ])

  if (patientsRes.error) throw new Error(patientsRes.error.message)
  if (conditionsRes.error) throw new Error(conditionsRes.error.message)
  if (clinicRes.error) throw new Error(clinicRes.error.message)
  if (visitsRes.error) throw new Error(visitsRes.error.message)
  if (teamsRes.error) throw new Error(teamsRes.error.message)
  if (facilitiesRes.error) throw new Error(facilitiesRes.error.message)

  const occupied = new Set(
    (visitsRes.data ?? [])
      .map((row) => row.patient_id)
      .filter((id): id is string => Boolean(id)),
  )
  const teamIndexById = new Map(teamIds.map((id, index) => [id, index]))
  const occupiedVisits: OccupiedVisit[] = []
  for (const row of visitsRes.data ?? []) {
    if (!row.patient_id || !row.start_time || !row.end_time || !row.team_id) continue
    if (!teamIndexById.has(row.team_id)) continue
    occupiedVisits.push({
      patientId: row.patient_id,
      start: normalizeOccupiedHms(String(row.start_time)),
      end: normalizeOccupiedHms(String(row.end_time)),
      teamIndex: teamIndexById.get(row.team_id) as number,
    })
  }

  const conditionMap = new Map(
    (conditionsRes.data ?? []).map((row) => [row.patient_id, row]),
  )
  const facilityCoords = new Map(
    (facilitiesRes.data ?? []).map((row) => [
      row.id,
      {
        latitude: asCoord(row.latitude),
        longitude: asCoord(row.longitude),
      },
    ]),
  )

  let excludedWithoutAddress = 0
  const candidates: ProposePatientSnapshot[] = []

  for (const patient of patientsRes.data ?? []) {
    if (occupied.has(patient.id)) continue
    if (!hasUsableAddress(patient.address)) {
      excludedWithoutAddress += 1
      continue
    }

    const condition = conditionMap.get(patient.id)
    const due = computeVisitDueInfo({
      targetDate: input.targetDate,
      visitFrequency: condition?.visit_frequency,
      lastVisitDate: condition?.last_visit_date,
      nextDueDate: condition?.next_due_date,
    })
    // 患者本人のジオコード座標を優先し、無ければ施設座標へフォールバック
    const ownLatitude = asCoord(patient.latitude)
    const ownLongitude = asCoord(patient.longitude)
    const coords =
      ownLatitude !== null && ownLongitude !== null
        ? { latitude: ownLatitude, longitude: ownLongitude }
        : patient.facility_id
          ? facilityCoords.get(patient.facility_id)
          : undefined
    const latitude = coords?.latitude ?? null
    const longitude = coords?.longitude ?? null

    candidates.push({
      patientId: patient.id,
      areaLabel: patient.area_label,
      facilityId: patient.facility_id,
      hasCoordinates: latitude !== null && longitude !== null,
      latitude,
      longitude,
      preferredWeekdays: condition?.preferred_weekdays ?? [],
      durationMinutes: condition?.standard_duration_minutes ?? 30,
      requiresDoctor: condition?.requires_doctor ?? false,
      priority: condition?.priority ?? 100,
      phoneConfirmationRequired:
        condition?.phone_confirmation_required ?? true,
      visitFrequency: due.visitFrequency,
      lastVisitDate: due.lastVisitDate,
      nextDueDate: due.nextDueDate,
      dueUrgencyDays: due.dueUrgencyDays,
      dueStatus: due.dueStatus,
    })
  }

  if (candidates.length === 0) {
    if (excludedWithoutAddress > 0) {
      throw new Error(
        `住所が登録された割付対象患者がいません（住所なし除外 ${excludedWithoutAddress} 件）`,
      )
    }
    throw new Error('割付対象の患者がいません（当日既に枠がある患者は除外しています）')
  }

  candidates.sort((a, b) => {
    const dueDiff = compareDueUrgency(a, b)
    if (dueDiff !== 0) return dueDiff
    return a.priority - b.priority
  })

  const lane = readIntroductionLane(clinicRes.data?.metadata)
  const preset = getProposalLanePreset(lane)

  // 緊急度上位から候補上限（ローカル/エージェント双方の入力）。過大な行列を避ける
  const candidateCap = Math.min(
    candidates.length,
    Math.max(preset.maxSlots + 12, Math.ceil(preset.maxSlots * 1.5)),
  )
  const patients = candidates.slice(0, candidateCap)

  const locations: TravelLocation[] = patients.map((patient) => ({
    patientId: patient.patientId,
    facilityId: patient.facilityId,
    areaLabel: patient.areaLabel,
    latitude: patient.latitude,
    longitude: patient.longitude,
  }))
  const travelMinutesMatrix = buildTravelMinutesMatrix(locations)

  const teamById = new Map((teamsRes.data ?? []).map((t) => [t.id, t.name]))
  const teams = teamIds.map((id, index) => ({
    index,
    id,
    name: teamById.get(id) ?? `号車${index + 1}`,
  }))

  return {
    schemaVersion: 2,
    clinicId: input.clinicId,
    targetDate: input.targetDate,
    introductionLane: lane,
    dayStart: preset.dayStart,
    dayEnd: preset.dayEnd,
    maxSlots: preset.maxSlots,
    travelGapMinutes: preset.travelGapMinutes,
    teams,
    patients,
    travelMinutesMatrix,
    excludedWithoutAddress,
    occupiedVisits,
  }
}
