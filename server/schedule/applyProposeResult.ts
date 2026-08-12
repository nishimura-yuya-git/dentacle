import type { SupabaseClient } from '@supabase/supabase-js'
import type { CursorUsageRecord } from '../cursor/usageTypes.ts'
import type {
  ProposeAgentResult,
  ProposeJobSnapshot,
  ProposeSlotResult,
} from './types.ts'
import type { ProposeAccuracyReport } from './validateProposeResult.ts'
import { toAccuracySnapshot } from './validateProposeResult.ts'

function resolveTeamId(
  slot: ProposeSlotResult,
  snapshot: ProposeJobSnapshot,
  sequenceIndex: number,
): string | null {
  if (snapshot.teams.length === 0) return null
  if (
    typeof slot.teamIndex === 'number' &&
    slot.teamIndex >= 0 &&
    slot.teamIndex < snapshot.teams.length
  ) {
    return snapshot.teams[slot.teamIndex].id
  }
  // 未指定時は1号車（横展開のラウンドロビンはしない）
  void sequenceIndex
  return snapshot.teams[0].id
}

/**
 * 構造化スロットを schedule_jobs / items / visits（仮予約）へ書き戻す。
 * エージェントは DB を触らない（§6.12）。
 */
export async function applyProposeResult(input: {
  supabase: SupabaseClient
  userId: string
  snapshot: ProposeJobSnapshot
  result: ProposeAgentResult
  modelId: string
  runtime: 'local' | 'cloud'
  agentDurationMs: number | null
  usage: CursorUsageRecord
  accuracy: ProposeAccuracyReport
}): Promise<{ jobId: string; generatedCount: number; adoptedCount: number }> {
  const { snapshot, result } = input
  if (result.slots.length === 0) {
    throw new Error('割付結果が0件でした')
  }

  const now = new Date().toISOString()
  const { data: job, error: jobError } = await input.supabase
    .from('schedule_jobs')
    .insert({
      clinic_id: snapshot.clinicId,
      target_date: snapshot.targetDate,
      team_id: snapshot.teams[0]?.id ?? null,
      status: 'succeeded',
      input_snapshot: {
        schemaVersion: snapshot.schemaVersion,
        targetDate: snapshot.targetDate,
        introductionLane: snapshot.introductionLane,
        patientCount: snapshot.patients.length,
        teamCount: snapshot.teams.length,
        maxSlots: snapshot.maxSlots,
        dayStart: snapshot.dayStart,
        dayEnd: snapshot.dayEnd,
        travelGapMinutes: snapshot.travelGapMinutes,
        excludedWithoutAddress: snapshot.excludedWithoutAddress,
        hasTravelMatrix: Boolean(snapshot.travelMinutesMatrix),
      },
      result_snapshot: {
        slotCount: result.slots.length,
        runtime: input.runtime,
        agentDurationMs: input.agentDurationMs,
        usage: input.usage,
        accuracy: toAccuracySnapshot(input.accuracy),
      },
      model:
        input.modelId === 'local-pack' || input.modelId.startsWith('local-')
          ? input.modelId
          : `cursor-sdk:${input.modelId}`,
      started_at: now,
      finished_at: now,
      created_by: input.userId,
    })
    .select('id')
    .single()

  if (jobError || !job) {
    throw new Error(jobError?.message || 'ジョブ作成に失敗しました')
  }

  const patientMeta = new Map(
    snapshot.patients.map((p) => [p.patientId, p]),
  )

  // 氏名結合用に患者マスタを取得（画面表示用。エージェントには渡していない）
  const { data: patientRows, error: patientError } = await input.supabase
    .from('patients')
    .select('id, facility_id, address, area_label')
    .eq('clinic_id', snapshot.clinicId)
    .in(
      'id',
      result.slots.map((s) => s.patientId),
    )
    .is('deleted_at', null)

  if (patientError) throw new Error(patientError.message)
  const patientDb = new Map((patientRows ?? []).map((row) => [row.id, row]))

  let adoptedCount = 0
  let sequenceNo = 0

  for (const slot of result.slots) {
    sequenceNo += 1
    const teamId = resolveTeamId(slot, snapshot, sequenceNo - 1)
    const meta = patientMeta.get(slot.patientId)
    const dbPatient = patientDb.get(slot.patientId)
    if (!meta || !dbPatient) continue

    const { data: item, error: itemError } = await input.supabase
      .from('schedule_job_items')
      .insert({
        clinic_id: snapshot.clinicId,
        job_id: job.id,
        patient_id: slot.patientId,
        team_id: teamId,
        sequence_no: sequenceNo,
        proposed_date: snapshot.targetDate,
        proposed_start: slot.proposedStart,
        proposed_end: slot.proposedEnd,
        status: 'proposed',
        reason: slot.reason ?? '自動提案',
        created_by: input.userId,
      })
      .select('id')
      .single()

    if (itemError || !item) {
      throw new Error(itemError?.message || '提案明細の作成に失敗しました')
    }

    const { data: visit, error: visitError } = await input.supabase
      .from('visits')
      .insert({
        clinic_id: snapshot.clinicId,
        patient_id: slot.patientId,
        team_id: teamId,
        facility_id: dbPatient.facility_id,
        scheduled_date: snapshot.targetDate,
        start_time: slot.proposedStart,
        end_time: slot.proposedEnd,
        status: 'tentative',
        source: 'auto_proposal',
        schedule_job_id: job.id,
        address_snapshot: dbPatient.address,
        area_label_snapshot: dbPatient.area_label,
        requires_doctor: meta.requiresDoctor,
        created_by: input.userId,
      })
      .select('id')
      .single()

    if (visitError || !visit) {
      throw new Error(visitError?.message || '仮予約の作成に失敗しました')
    }

    if (meta.phoneConfirmationRequired) {
      const { error: phoneError } = await input.supabase
        .from('visit_phone_confirmations')
        .insert({
          clinic_id: snapshot.clinicId,
          visit_id: visit.id,
          patient_id: slot.patientId,
          status: 'pending',
          created_by: input.userId,
        })
      if (phoneError) throw new Error(phoneError.message)
    }

    const { error: adoptError } = await input.supabase
      .from('schedule_job_items')
      .update({
        status: 'adopted',
        adopted_visit_id: visit.id,
        updated_by: input.userId,
      })
      .eq('id', item.id)

    if (adoptError) throw new Error(adoptError.message)
    adoptedCount += 1
  }

  if (adoptedCount === 0) {
    throw new Error('仮予約を1件も登録できませんでした')
  }

  return {
    jobId: job.id,
    generatedCount: result.slots.length,
    adoptedCount,
  }
}
