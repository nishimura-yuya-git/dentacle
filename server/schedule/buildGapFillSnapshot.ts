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
import { computeVisitDueInfo } from '../../src/utils/schedule/visitDueUrgency.ts'
import {
  computeGapProximityMinutes,
  resolveGapFillAnchors,
  sortGapFillPatientsByProximity,
} from './rankGapFillByProximity.ts'
import type {
  GapFillExistingVisit,
  GapFillJobSnapshot,
  GapFillPatientSnapshot,
} from './types.ts'

/** 空き枠埋めでは候補上限を広めに取る（全日提案の cap 切れを補う） */
const GAP_FILL_CANDIDATE_CAP = 60
const GAP_FILL_MAX_SLOTS = 5

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

function normalizeHms(value: string): string {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim())
  if (!match) return value
  const hh = String(Number(match[1])).padStart(2, '0')
  const mm = String(Number(match[2])).padStart(2, '0')
  const ss = String(Number(match[3] ?? '0')).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

/**
 * 空き枠埋め用スナップショット。
 * 生住所は載せない。距離行列はアプリ側 SSoT（§6.12 / §6.16）。
 */
export async function buildGapFillSnapshot(input: {
  supabase: SupabaseClient
  clinicId: string
  targetDate: string
  vehicleTeamIds: string[]
  teamId: string
  windowStart: string
  windowEnd: string
  userMessage: string
}): Promise<GapFillJobSnapshot> {
  const teamIds = input.vehicleTeamIds.filter(Boolean)
  const windowStart = normalizeHms(input.windowStart)
  const windowEnd = normalizeHms(input.windowEnd)

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
        .select('patient_id, team_id, start_time, end_time')
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

  const teamById = new Map((teamsRes.data ?? []).map((t) => [t.id, t.name]))
  const teams = teamIds.map((id, index) => ({
    index,
    id,
    name: teamById.get(id) ?? `号車${index + 1}`,
  }))
  const teamIndexById = new Map(teams.map((t) => [t.id, t.index]))

  const preferredTeamIndex = teamIndexById.has(input.teamId)
    ? (teamIndexById.get(input.teamId) as number)
    : 0

  const occupied = new Set<string>()
  const existingVisits: GapFillExistingVisit[] = []
  for (const row of visitsRes.data ?? []) {
    if (row.patient_id) occupied.add(row.patient_id)
    const teamIndex =
      row.team_id && teamIndexById.has(row.team_id)
        ? (teamIndexById.get(row.team_id) as number)
        : preferredTeamIndex
    if (row.patient_id && row.start_time && row.end_time) {
      existingVisits.push({
        patientId: row.patient_id,
        start: normalizeHms(String(row.start_time)),
        end: normalizeHms(String(row.end_time)),
        teamIndex,
      })
    }
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
  const locationByPatientId = new Map<string, TravelLocation>()
  const candidates: GapFillPatientSnapshot[] = []

  for (const patient of patientsRes.data ?? []) {
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
    locationByPatientId.set(patient.id, {
      patientId: patient.id,
      facilityId: patient.facility_id,
      areaLabel: patient.area_label,
      latitude,
      longitude,
    })

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
      gapProximityMinutes: null,
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

  const anchorPatientIds = resolveGapFillAnchors(
    existingVisits,
    preferredTeamIndex,
    windowStart,
    windowEnd,
  )

  /** 候補 + アンカーを行列に載せ、近接分を算出できるようにする */
  const locationIds = new Set([
    ...candidates.map((patient) => patient.patientId),
    ...anchorPatientIds,
  ])
  const locations: TravelLocation[] = [...locationIds]
    .map((id) => locationByPatientId.get(id))
    .filter((row): row is TravelLocation => Boolean(row))
  const travelMinutesMatrix = buildTravelMinutesMatrix(locations)

  for (const patient of candidates) {
    patient.gapProximityMinutes = computeGapProximityMinutes(
      patient.patientId,
      anchorPatientIds,
      travelMinutesMatrix,
    )
  }

  const patients = sortGapFillPatientsByProximity(candidates).slice(
    0,
    GAP_FILL_CANDIDATE_CAP,
  )

  const lane = readIntroductionLane(clinicRes.data?.metadata)
  const preset = getProposalLanePreset(lane)

  return {
    schemaVersion: 2,
    mode: 'gap_fill',
    clinicId: input.clinicId,
    targetDate: input.targetDate,
    introductionLane: lane,
    /** 精度ゲートは空き枠帯を稼働帯として見る */
    dayStart: windowStart,
    dayEnd: windowEnd,
    maxSlots: GAP_FILL_MAX_SLOTS,
    travelGapMinutes: preset.travelGapMinutes,
    teams,
    patients,
    travelMinutesMatrix,
    excludedWithoutAddress,
    windowStart,
    windowEnd,
    preferredTeamIndex,
    existingVisits,
    anchorPatientIds,
    userMessage: input.userMessage.trim() || 'この空き枠に入れそうな患者を提案してください',
  }
}
