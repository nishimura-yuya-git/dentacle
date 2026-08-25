import type { PatientIconId } from '@/pages/Patients/patientIconPolicy'

export type PatientListRow = {
  id: string
  name_kanji: string
  name_kana: string | null
  chart_number: string | null
  phone: string | null
  primary_doctor_id: string | null
  primary_doctor_name: string | null
  last_visit_date: string | null
  next_visit_date: string | null
  next_visit_time: string | null
  next_visit_provisional: boolean
  visit_count: number | null
  icon_id: PatientIconId
  has_infectious_disease: boolean
}

export type StaffOption = {
  id: string
  display_name: string
  staff_type: string
}
