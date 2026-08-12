import { supabase } from '@/lib/supabase'
import { readIntroductionLane } from '@/utils/clinic/clinicMetadata'
import { buildDay0Proposal, type ProposalPatient } from '@/utils/schedule/day0Proposal'
import {
  getProposalLanePreset,
  type IntroductionLane,
} from '@/utils/schedule/proposalLanePresets'
import type { JobItem } from '../types'

export async function generateDay0Job(input: {
  clinicId: string
  userId: string
  targetDate: string
  teamId: string | null
  /** 指定時はそのレーン。未指定時は clinics.metadata.introduction_lane */
  lane?: IntroductionLane
  /** 提案対象から除外する患者（既存割付・NG当日の再提案など） */
  excludePatientIds?: string[]
  /** 指定時はこの患者群だけを提案対象にする（NG後の再提案など） */
  onlyPatientIds?: string[]
}): Promise<{ jobId: string; slotCount: number; lane: IntroductionLane }> {
  const [patientsRes, conditionsRes, clinicRes] = await Promise.all([
    supabase
      .from('patients')
      .select('id, name_kanji, area_label, facility_id')
      .eq('clinic_id', input.clinicId)
      .eq('is_active', true)
      .is('deleted_at', null),
    supabase
      .from('patient_visit_conditions')
      .select(
        'patient_id, preferred_weekdays, standard_duration_minutes, requires_doctor, priority, phone_confirmation_required'
      )
      .eq('clinic_id', input.clinicId)
      .is('deleted_at', null),
    supabase
      .from('clinics')
      .select('metadata')
      .eq('id', input.clinicId)
      .is('deleted_at', null)
      .maybeSingle(),
  ])

  if (patientsRes.error) throw new Error(patientsRes.error.message)
  if (conditionsRes.error) throw new Error(conditionsRes.error.message)
  if (clinicRes.error) throw new Error(clinicRes.error.message)

  const lane =
    input.lane ?? readIntroductionLane(clinicRes.data?.metadata ?? null)
  const preset = getProposalLanePreset(lane)

  const conditionMap = new Map(
    (conditionsRes.data ?? []).map((row) => [row.patient_id, row])
  )
  const exclude = new Set(input.excludePatientIds ?? [])
  const only =
    input.onlyPatientIds && input.onlyPatientIds.length > 0
      ? new Set(input.onlyPatientIds)
      : null
  const proposalPatients: ProposalPatient[] = (patientsRes.data ?? [])
    .filter((patient) => !exclude.has(patient.id))
    .filter((patient) => (only ? only.has(patient.id) : true))
    .map((patient) => {
      const condition = conditionMap.get(patient.id)
      return {
        patientId: patient.id,
        name: patient.name_kanji,
        areaLabel: patient.area_label,
        facilityId: patient.facility_id,
        preferredWeekdays: condition?.preferred_weekdays ?? [],
        durationMinutes: condition?.standard_duration_minutes ?? 30,
        requiresDoctor: condition?.requires_doctor ?? false,
        priority: condition?.priority ?? 100,
      }
    })

  if (proposalPatients.length === 0) {
    throw new Error('有効な患者がいないため提案を生成できません')
  }

  const slots = buildDay0Proposal({
    targetDate: input.targetDate,
    patients: proposalPatients,
    lane,
  })
  const now = new Date().toISOString()

  const { data: job, error: jobError } = await supabase
    .from('schedule_jobs')
    .insert({
      clinic_id: input.clinicId,
      target_date: input.targetDate,
      team_id: input.teamId,
      status: 'succeeded',
      input_snapshot: {
        targetDate: input.targetDate,
        teamId: input.teamId,
        patientCount: proposalPatients.length,
        introductionLane: lane,
        preset: {
          maxSlots: preset.maxSlots,
          dayStart: preset.dayStart,
          dayEnd: preset.dayEnd,
          travelGapMinutes: preset.travelGapMinutes,
        },
      },
      result_snapshot: {
        note: preset.label,
        slotCount: slots.length,
      },
      model: 'day0-local',
      started_at: now,
      finished_at: now,
      created_by: input.userId,
    })
    .select('id')
    .single()

  if (jobError || !job) {
    throw new Error(jobError?.message || 'ジョブ作成に失敗しました')
  }

  const { error: itemsError } = await supabase.from('schedule_job_items').insert(
    slots.map((slot) => ({
      clinic_id: input.clinicId,
      job_id: job.id,
      patient_id: slot.patientId,
      team_id: input.teamId,
      sequence_no: slot.sequenceNo,
      proposed_date: slot.proposedDate,
      proposed_start: slot.proposedStart,
      proposed_end: slot.proposedEnd,
      status: 'proposed',
      reason: slot.reason,
      created_by: input.userId,
    }))
  )

  if (itemsError) throw new Error(itemsError.message)
  return { jobId: job.id, slotCount: slots.length, lane }
}

export async function adoptJobItem(input: {
  clinicId: string
  userId: string
  item: JobItem
}): Promise<void> {
  const { item } = input
  const [patientRes, conditionRes] = await Promise.all([
    supabase
      .from('patients')
      .select('id, facility_id, address, area_label')
      .eq('id', item.patient_id)
      .is('deleted_at', null)
      .maybeSingle(),
    supabase
      .from('patient_visit_conditions')
      .select('requires_doctor, phone_confirmation_required')
      .eq('patient_id', item.patient_id)
      .is('deleted_at', null)
      .maybeSingle(),
  ])

  if (patientRes.error || !patientRes.data) {
    throw new Error(patientRes.error?.message || '患者情報の取得に失敗しました')
  }

  const { data: visit, error: visitError } = await supabase
    .from('visits')
    .insert({
      clinic_id: input.clinicId,
      patient_id: item.patient_id,
      team_id: item.team_id,
      facility_id: patientRes.data.facility_id,
      scheduled_date: item.proposed_date,
      start_time: item.proposed_start,
      end_time: item.proposed_end,
      status: 'tentative',
      source: 'auto_proposal',
      schedule_job_id: item.job_id,
      address_snapshot: patientRes.data.address,
      area_label_snapshot: patientRes.data.area_label,
      requires_doctor: conditionRes.data?.requires_doctor ?? false,
      created_by: input.userId,
    })
    .select('id')
    .single()

  if (visitError || !visit) {
    throw new Error(visitError?.message || '仮予約の作成に失敗しました')
  }

  const phoneRequired = conditionRes.data?.phone_confirmation_required ?? true
  if (phoneRequired) {
    const { error: phoneError } = await supabase.from('visit_phone_confirmations').insert({
      clinic_id: input.clinicId,
      visit_id: visit.id,
      patient_id: item.patient_id,
      status: 'pending',
      created_by: input.userId,
    })
    if (phoneError) throw new Error(phoneError.message)
  }

  const { error: updateError } = await supabase
    .from('schedule_job_items')
    .update({
      status: 'adopted',
      adopted_visit_id: visit.id,
      updated_by: input.userId,
    })
    .eq('id', item.id)

  if (updateError) throw new Error(updateError.message)
}

export async function rejectJobItem(input: {
  userId: string
  itemId: string
}): Promise<void> {
  const { error } = await supabase
    .from('schedule_job_items')
    .update({
      status: 'rejected',
      updated_by: input.userId,
    })
    .eq('id', input.itemId)
  if (error) throw new Error(error.message)
}

/**
 * カレンダー主導線用: 対象日の Day0 案を生成し、提案中明細を仮予約として一括採用する。
 * 号車チームがある場合は順に振り分けてカレンダー列に載せる。
 */
export async function generateAndAdoptDay0ForDate(input: {
  clinicId: string
  userId: string
  targetDate: string
  vehicleTeamIds: string[]
  excludePatientIds?: string[]
  onlyPatientIds?: string[]
}): Promise<{ jobId: string; generatedCount: number; adoptedCount: number }> {
  const { jobId, slotCount } = await generateDay0Job({
    clinicId: input.clinicId,
    userId: input.userId,
    targetDate: input.targetDate,
    teamId: null,
    excludePatientIds: input.excludePatientIds,
    onlyPatientIds: input.onlyPatientIds,
  })

  if (slotCount === 0) {
    throw new Error('割付対象の提案が0件でした')
  }

  const { data: items, error: itemsError } = await supabase
    .from('schedule_job_items')
    .select(
      'id, job_id, patient_id, team_id, sequence_no, proposed_date, proposed_start, proposed_end, status, reason, adopted_visit_id'
    )
    .eq('job_id', jobId)
    .eq('status', 'proposed')
    .is('deleted_at', null)
    .order('sequence_no', { ascending: true })

  if (itemsError) throw new Error(itemsError.message)

  const proposed = (items ?? []) as JobItem[]
  const teamIds = input.vehicleTeamIds.filter(Boolean)

  if (teamIds.length > 0) {
    for (let index = 0; index < proposed.length; index += 1) {
      const teamId = teamIds[index % teamIds.length]
      const { error: assignError } = await supabase
        .from('schedule_job_items')
        .update({ team_id: teamId, updated_by: input.userId })
        .eq('id', proposed[index].id)
      if (assignError) throw new Error(assignError.message)
      proposed[index] = { ...proposed[index], team_id: teamId }
    }
  }

  let adoptedCount = 0
  for (const item of proposed) {
    await adoptJobItem({
      clinicId: input.clinicId,
      userId: input.userId,
      item,
    })
    adoptedCount += 1
  }

  return { jobId, generatedCount: slotCount, adoptedCount }
}
