import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ensureVehicleTeams } from '@/pages/Calendar/utils/ensureVehicleTeams'
import { createPatientConfirmedVisit } from '@/pages/Patients/createPatientConfirmedVisit'
import {
  todayIsoDate,
  type PatientConfirmedVisitDraft,
  type PatientConfirmedVisitRow,
} from '@/pages/Patients/patientConfirmedVisit'

export function usePatientConfirmedVisits(input: {
  clinicId: string
  patientId: string
  userId: string | null
}) {
  const [teams, setTeams] = useState<Array<{ value: string; label: string }>>([])
  const [rows, setRows] = useState<PatientConfirmedVisitRow[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const ensured = await ensureVehicleTeams(input.clinicId)
    if (ensured.error) {
      setLoading(false)
      setError(ensured.error)
      return
    }
    const teamOptions = ensured.teams.map((team) => ({
      value: team.id,
      label: team.name,
    }))
    const nameById = new Map(ensured.teams.map((team) => [team.id, team.name]))

    const { data, error: visitError } = await supabase
      .from('visits')
      .select('id, scheduled_date, start_time, end_time, team_id')
      .eq('clinic_id', input.clinicId)
      .eq('patient_id', input.patientId)
      .eq('status', 'confirmed')
      .is('deleted_at', null)
      .gte('scheduled_date', todayIsoDate())
      .order('scheduled_date')
      .order('start_time')

    setLoading(false)
    if (visitError) {
      setError(visitError.message)
      return
    }

    setTeams(teamOptions)
    setRows(
      (data ?? []).map((row) => ({
        id: row.id,
        scheduledDate: row.scheduled_date,
        startTime: row.start_time,
        endTime: row.end_time,
        teamName: (row.team_id && nameById.get(row.team_id)) || '号車未設定',
      })),
    )
  }, [input.clinicId, input.patientId])

  useEffect(() => {
    void load()
  }, [load])

  async function register(draft: PatientConfirmedVisitDraft) {
    if (!input.userId) {
      return { ok: false as const, message: 'ログインし直してください' }
    }
    setBusy(true)
    setError(null)
    const result = await createPatientConfirmedVisit({
      clinicId: input.clinicId,
      patientId: input.patientId,
      userId: input.userId,
      draft,
    })
    setBusy(false)
    if (!result.ok) {
      setError(result.message)
      return result
    }
    await load()
    return result
  }

  return { teams, rows, loading, busy, error, register }
}
