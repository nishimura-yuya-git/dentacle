export type CalendarVisit = {
  id: string
  team_id: string | null
  start_time: string
  end_time: string
  status: string
  /** manual / auto_proposal / import */
  source: string
  patients: { name_kanji: string } | null
}

export type CalendarBlock = {
  id: string
  team_id: string | null
  start_time: string
  end_time: string
  block_type: string
  title: string | null
}
