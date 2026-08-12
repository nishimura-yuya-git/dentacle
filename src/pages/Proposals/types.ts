export type Team = { id: string; name: string }

export type JobRow = {
  id: string
  clinic_id: string
  clinicName: string
  target_date: string
  team_id: string | null
  teamName: string | null
  status: string
  created_at: string
  result_snapshot: { note?: string; slotCount?: number } | null
}

export type JobItem = {
  id: string
  job_id: string
  patient_id: string
  team_id: string | null
  sequence_no: number
  proposed_date: string
  proposed_start: string
  proposed_end: string
  status: string
  reason: string | null
  adopted_visit_id: string | null
  patients: { name_kanji: string; area_label: string | null } | null
}

export const ITEM_STATUS_LABEL: Record<string, string> = {
  proposed: '提案中',
  adopted: '採用済み',
  rejected: '却下',
  superseded: '上書き済',
}
