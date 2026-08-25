import { ensurePhoneConfirmationForVisit } from '@/features/calendar/ensurePhoneConfirmation'
import { writeOperationTrace } from '@/features/calendar/writeOperationTrace'
import { supabase } from '@/lib/supabase'
import {
  createVisitRegisteredMessage,
  resolveCreateVisitStatus,
} from '@/pages/Calendar/utils/visitCreateBooking'
import {
  toVisitTimeHms,
  validatePatientConfirmedVisitDraft,
  type PatientConfirmedVisitDraft,
} from '@/pages/Patients/patientConfirmedVisit'

export async function createPatientConfirmedVisit(input: {
  clinicId: string
  patientId: string
  userId: string
  draft: PatientConfirmedVisitDraft
}): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const check = validatePatientConfirmedVisitDraft(input.draft)
  if (!check.ok) return check

  const status = resolveCreateVisitStatus('confirmed')
  const { data: visit, error } = await supabase
    .from('visits')
    .insert({
      clinic_id: input.clinicId,
      patient_id: input.patientId,
      team_id: input.draft.teamId,
      scheduled_date: input.draft.date,
      start_time: toVisitTimeHms(input.draft.start),
      end_time: toVisitTimeHms(input.draft.end),
      status,
      source: 'manual',
      created_by: input.userId,
      updated_by: input.userId,
    })
    .select('id')
    .single()

  if (error || !visit) {
    return { ok: false, message: error?.message ?? '登録に失敗しました' }
  }

  try {
    await ensurePhoneConfirmationForVisit({
      clinicId: input.clinicId,
      visitId: visit.id,
      patientId: input.patientId,
      userId: input.userId,
    })
    const now = new Date().toISOString()
    const { error: phoneError } = await supabase
      .from('visit_phone_confirmations')
      .update({
        status: 'ok',
        contacted_at: now,
        contacted_by: input.userId,
        updated_by: input.userId,
        updated_at: now,
      })
      .eq('visit_id', visit.id)
      .eq('clinic_id', input.clinicId)
      .eq('status', 'pending')
      .is('deleted_at', null)
    if (phoneError) throw new Error(phoneError.message)
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : '電話確認の作成に失敗しました',
    }
  }

  void writeOperationTrace({
    clinicId: input.clinicId,
    userId: input.userId,
    action: 'visit.create_manual',
    entityType: 'visit',
    entityId: visit.id,
    payload: {
      date: input.draft.date,
      teamId: input.draft.teamId,
      status,
      from: 'patient_detail',
    },
  })

  return { ok: true, message: createVisitRegisteredMessage(status) }
}
