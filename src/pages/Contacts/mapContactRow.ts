import type { ContactRow } from './contactListTypes'
import { resolvePatientIconId } from '../Patients/patientIconPolicy.ts'

export type ContactRowSource = Omit<ContactRow, 'icon_id' | 'patients'> & {
  patients: {
    name_kanji: string
    name_kana: string | null
    chart_number: string | null
    phone: string | null
    area_label: string | null
    metadata?: unknown
  } | null
}

/** 電話確認行に患者アイコンを載せる。判定は patientIconPolicy が正。 */
export function toContactRow(row: ContactRowSource): ContactRow {
  const { patients, ...rest } = row
  return {
    ...rest,
    icon_id: resolvePatientIconId(patients?.metadata, row.patient_id),
    patients: patients
      ? {
          name_kanji: patients.name_kanji,
          name_kana: patients.name_kana,
          chart_number: patients.chart_number,
          phone: patients.phone,
          area_label: patients.area_label,
        }
      : null,
  }
}
