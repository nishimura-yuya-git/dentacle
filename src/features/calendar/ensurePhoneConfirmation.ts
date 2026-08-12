import { supabase } from '@/lib/supabase'

/**
 * 仮予約に電話確認キューを用意する（既存があれば何もしない）。
 * phone_confirmation_required が false の患者はスキップ。
 */
export async function ensurePhoneConfirmationForVisit(input: {
  clinicId: string
  visitId: string
  patientId: string
  userId: string | null
}): Promise<{ created: boolean }> {
  const { data: condition } = await supabase
    .from('patient_visit_conditions')
    .select('phone_confirmation_required')
    .eq('patient_id', input.patientId)
    .is('deleted_at', null)
    .maybeSingle()

  const required = condition?.phone_confirmation_required ?? true
  if (!required) return { created: false }

  const { data: existing } = await supabase
    .from('visit_phone_confirmations')
    .select('id')
    .eq('visit_id', input.visitId)
    .is('deleted_at', null)
    .maybeSingle()

  if (existing?.id) return { created: false }

  const { error } = await supabase.from('visit_phone_confirmations').insert({
    clinic_id: input.clinicId,
    visit_id: input.visitId,
    patient_id: input.patientId,
    status: 'pending',
    created_by: input.userId,
  })
  if (error) throw new Error(error.message)
  return { created: true }
}
