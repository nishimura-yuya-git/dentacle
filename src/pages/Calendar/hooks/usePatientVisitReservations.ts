import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  ensureCurrentReservation,
  toPatientVisitReservation,
  type PatientVisitReservation,
} from '@/pages/Calendar/utils/visitReservationRows'

type Args = {
  clinicId?: string
  patientId?: string
  open: boolean
  current?: PatientVisitReservation | null
}

export function usePatientVisitReservations({
  clinicId,
  patientId,
  open,
  current,
}: Args) {
  const [rows, setRows] = useState<PatientVisitReservation[]>([])
  const [loading, setLoading] = useState(false)
  const currentRef = useRef(current)
  currentRef.current = current

  const reload = useCallback(async () => {
    const snapshot = currentRef.current
    if (!clinicId || !patientId) {
      setRows(snapshot ? [snapshot] : [])
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('visits')
      .select(
        'id, scheduled_date, start_time, end_time, status, metadata, staff_members(display_name)',
      )
      .eq('clinic_id', clinicId)
      .eq('patient_id', patientId)
      .is('deleted_at', null)
      .order('scheduled_date', { ascending: false })
      .order('start_time', { ascending: false })
      .limit(12)
    setLoading(false)
    if (error) {
      setRows(snapshot ? [snapshot] : [])
      return
    }
    const next = (data ?? []).map((row) => toPatientVisitReservation(row))
    setRows(snapshot ? ensureCurrentReservation(next, snapshot) : next)
  }, [clinicId, patientId])

  useEffect(() => {
    if (!open) return
    void reload()
  }, [open, reload])

  return { rows, loading, reload }
}
