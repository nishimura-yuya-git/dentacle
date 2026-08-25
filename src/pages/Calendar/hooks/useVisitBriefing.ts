import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { BriefingConstraint } from '@/pages/Calendar/utils/visitBriefing'

export type VisitBriefingData = {
  loading: boolean
  address: string | null
  phone: string | null
  lastVisitDate: string | null
  preferredWeekdays: number[]
  preferredTimeStart: string | null
  preferredTimeEnd: string | null
  hasInfectiousDisease: boolean
  constraints: BriefingConstraint[]
}

const EMPTY: Omit<VisitBriefingData, 'loading'> = {
  address: null,
  phone: null,
  lastVisitDate: null,
  preferredWeekdays: [],
  preferredTimeStart: null,
  preferredTimeEnd: null,
  hasInfectiousDisease: false,
  constraints: [],
}

export function useVisitBriefing({
  clinicId,
  patientId,
  open,
}: {
  clinicId?: string
  patientId?: string
  open: boolean
}): VisitBriefingData {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(EMPTY)

  useEffect(() => {
    if (!open || !clinicId || !patientId) {
      setData(EMPTY)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    void (async () => {
      const [patientRes, conditionRes, constraintRes] = await Promise.all([
        supabase
          .from('patients')
          .select('address, phone, has_infectious_disease')
          .eq('clinic_id', clinicId)
          .eq('id', patientId)
          .is('deleted_at', null)
          .maybeSingle(),
        supabase
          .from('patient_visit_conditions')
          .select('last_visit_date, preferred_weekdays, preferred_time_start, preferred_time_end')
          .eq('clinic_id', clinicId)
          .eq('patient_id', patientId)
          .is('deleted_at', null)
          .maybeSingle(),
        supabase
          .from('patient_constraints')
          .select('constraint_type, day_of_week, specific_date, note, start_time, end_time')
          .eq('clinic_id', clinicId)
          .eq('patient_id', patientId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(8),
      ])
      if (cancelled) return
      setData({
        address: patientRes.data?.address ?? null,
        phone: patientRes.data?.phone ?? null,
        hasInfectiousDisease: patientRes.data?.has_infectious_disease === true,
        lastVisitDate: conditionRes.data?.last_visit_date ?? null,
        preferredWeekdays: conditionRes.data?.preferred_weekdays ?? [],
        preferredTimeStart: conditionRes.data?.preferred_time_start ?? null,
        preferredTimeEnd: conditionRes.data?.preferred_time_end ?? null,
        constraints: constraintRes.data ?? [],
      })
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [clinicId, patientId, open])

  return { loading, ...data }
}
