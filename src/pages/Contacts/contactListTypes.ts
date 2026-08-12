export type PhoneStatus =
  | 'pending'
  | 'ok'
  | 'ng'
  | 'absent'
  | 'callback_waiting'
  | 'facility_waiting'

export type ContactRow = {
  id: string
  status: string
  result_note: string | null
  contacted_at: string | null
  visit_id: string
  patient_id: string
  visits: {
    scheduled_date: string
    start_time: string
    end_time: string
    status: string
  } | null
  patients: {
    name_kanji: string
    name_kana: string | null
    chart_number: string | null
    phone: string | null
    area_label: string | null
  } | null
}
