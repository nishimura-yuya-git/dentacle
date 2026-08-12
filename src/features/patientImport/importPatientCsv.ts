import { supabase } from '@/lib/supabase'
import type { NormalizedPatientSeed, NormalizedStaffSeed } from '@/features/patientImport/normalizePatientCsv'

export type ImportProgressStep =
  | '準備'
  | '担当者'
  | '患者'
  | '訪問条件'
  | '完了'

export type ImportPatientCsvResult = {
  staffUpserted: number
  patientsInserted: number
  patientsUpdated: number
  conditionsUpserted: number
  errors: string[]
}

type ProgressFn = (step: ImportProgressStep, detail: string) => void

async function upsertStaff(
  clinicId: string,
  staff: NormalizedStaffSeed[],
  onProgress?: ProgressFn
): Promise<Map<string, string>> {
  const codeToId = new Map<string, string>()
  for (const [index, person] of staff.entries()) {
    onProgress?.(
      '担当者',
      `${index + 1}/${staff.length} 件を反映中（氏名はログしません）`
    )
    const { data: existing } = await supabase
      .from('staff_members')
      .select('id')
      .eq('clinic_id', clinicId)
      .eq('external_code', person.externalCode)
      .is('deleted_at', null)
      .maybeSingle()

    if (existing?.id) {
      await supabase
        .from('staff_members')
        .update({
          display_name: person.displayName,
          staff_type: 'doctor',
          is_active: true,
        })
        .eq('id', existing.id)
      codeToId.set(person.externalCode, existing.id)
      continue
    }

    const { data: created, error } = await supabase
      .from('staff_members')
      .insert({
        clinic_id: clinicId,
        display_name: person.displayName,
        staff_type: 'doctor',
        external_code: person.externalCode,
      })
      .select('id')
      .single()

    if (error || !created) {
      throw new Error(error?.message ?? '担当者の登録に失敗しました')
    }
    codeToId.set(person.externalCode, created.id)
  }
  return codeToId
}

export async function importNormalizedPatients(input: {
  clinicId: string
  staff: NormalizedStaffSeed[]
  patients: NormalizedPatientSeed[]
  onProgress?: ProgressFn
}): Promise<ImportPatientCsvResult> {
  const errors: string[] = []
  let patientsInserted = 0
  let patientsUpdated = 0
  let conditionsUpserted = 0

  input.onProgress?.('準備', '取込を開始します')
  const staffMap = await upsertStaff(input.clinicId, input.staff, input.onProgress)

  for (const [index, patient] of input.patients.entries()) {
    input.onProgress?.(
      '患者',
      `${index + 1}/${input.patients.length} 件を反映中（個人情報はログしません）`
    )
    try {
      const primaryDoctorId = patient.primaryDoctorCode
        ? staffMap.get(patient.primaryDoctorCode) ?? null
        : null

      const { data: existing } = await supabase
        .from('patients')
        .select('id')
        .eq('clinic_id', input.clinicId)
        .eq('chart_number', patient.chartNumber)
        .is('deleted_at', null)
        .maybeSingle()

      let patientId = existing?.id
      const metadata =
        patient.visitCount != null
          ? { visit_count: patient.visitCount, seed_source: 'rececon_csv' }
          : { seed_source: 'rececon_csv' }

      if (patientId) {
        const { error } = await supabase
          .from('patients')
          .update({
            name_kanji: patient.nameKanji,
            name_kana: patient.nameKana || null,
            primary_doctor_id: primaryDoctorId,
            is_active: true,
            metadata,
          })
          .eq('id', patientId)
        if (error) throw error
        patientsUpdated += 1
      } else {
        const { data: created, error } = await supabase
          .from('patients')
          .insert({
            clinic_id: input.clinicId,
            chart_number: patient.chartNumber,
            name_kanji: patient.nameKanji,
            name_kana: patient.nameKana || null,
            primary_doctor_id: primaryDoctorId,
            metadata,
          })
          .select('id')
          .single()
        if (error || !created) throw error ?? new Error('患者登録に失敗')
        patientId = created.id
        patientsInserted += 1
      }

      input.onProgress?.(
        '訪問条件',
        `${index + 1}/${input.patients.length} 件の仮条件を更新中`
      )

      const { data: condition } = await supabase
        .from('patient_visit_conditions')
        .select('id')
        .eq('patient_id', patientId)
        .is('deleted_at', null)
        .maybeSingle()

      if (condition?.id) {
        const { error } = await supabase
          .from('patient_visit_conditions')
          .update({
            last_visit_date: patient.lastVisitDate,
            is_provisional: true,
            visit_frequency: 'unknown',
          })
          .eq('id', condition.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('patient_visit_conditions').insert({
          clinic_id: input.clinicId,
          patient_id: patientId,
          visit_frequency: 'unknown',
          preferred_weekdays: [],
          last_visit_date: patient.lastVisitDate,
          is_provisional: true,
          phone_confirmation_required: true,
        })
        if (error) throw error
      }
      conditionsUpserted += 1
    } catch (error) {
      const message = error instanceof Error ? error.message : '不明なエラー'
      errors.push(`行 ${patient.sourceLine}: ${message}`)
    }
  }

  input.onProgress?.('完了', '取込処理が終了しました')
  return {
    staffUpserted: staffMap.size,
    patientsInserted,
    patientsUpdated,
    conditionsUpserted,
    errors,
  }
}
