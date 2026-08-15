import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Json } from '@/types/database.types'
import { readVisitMenuEnabled } from '@/utils/clinic/clinicMetadata'
import { readVisitCellColor } from '@/utils/visitMenus/visitCellColor'
import type { CalendarBlock, CalendarVisit } from '@/pages/Calendar/components/DayVisitGrid'
import {
  ensureVehicleTeams,
  type VehicleTeam,
} from '@/pages/Calendar/utils/ensureVehicleTeams'
import { INITIAL_VISIBLE_VEHICLE_COLUMNS } from '@/pages/Calendar/utils/vehicleTeams'
import {
  isLatestCalendarDayLoad,
  shouldClearCalendarDayLoading,
} from '@/pages/Calendar/hooks/calendarDayLoadState'
import {
  readStoredVisibleColumns,
  resolveVisibleColumns,
  writeStoredVisibleColumns,
} from '@/pages/Calendar/utils/visibleVehicleColumns'

export type VisitRow = CalendarVisit & {
  patient_id: string
  staff_id: string | null
  metadata?: Json | null
}
export type StaffOption = { id: string; display_name: string }
export type PatientOption = { id: string; name_kanji: string }
export type LoadOptions = { silent?: boolean }

type Staff = StaffOption

export type VisitLocalPatch = {
  team_id?: string | null
  start_time?: string
  end_time?: string
  status?: string
}

export function useCalendarDayData(clinicId: string | undefined, date: string) {
  const [visibleColumns, setVisibleColumns] = useState(INITIAL_VISIBLE_VEHICLE_COLUMNS)
  const [allTeams, setAllTeams] = useState<VehicleTeam[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [patients, setPatients] = useState<PatientOption[]>([])
  const [visits, setVisits] = useState<VisitRow[]>([])
  const [blocks, setBlocks] = useState<CalendarBlock[]>([])
  const [cancelledCount, setCancelledCount] = useState(0)
  const [dayMemo, setDayMemo] = useState('')
  const [visitMenuEnabled, setVisitMenuEnabled] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loadSeqRef = useRef(0)

  useEffect(() => {
    if (!clinicId) {
      setVisibleColumns(INITIAL_VISIBLE_VEHICLE_COLUMNS)
      return
    }
    setVisibleColumns(readStoredVisibleColumns(clinicId) ?? INITIAL_VISIBLE_VEHICLE_COLUMNS)
  }, [clinicId])

  const load = useCallback(async (options?: LoadOptions) => {
    if (!clinicId) return
    const silent = options?.silent === true
    const seq = ++loadSeqRef.current
    if (!silent) {
      setLoading(true)
      setVisits([])
    }

    const ensured = await ensureVehicleTeams(clinicId)
    if (!isLatestCalendarDayLoad(seq, loadSeqRef.current)) return
    if (ensured.error) {
      if (shouldClearCalendarDayLoading({ isLatest: true, silent })) {
        setLoading(false)
      }
      setError(ensured.error)
      return
    }
    setAllTeams(ensured.teams)

    const [
      staffRes,
      patientsRes,
      visitsRes,
      usedTeamsRes,
      blocksRes,
      memoRes,
      cancelledRes,
      clinicRes,
    ] = await Promise.all([
      supabase
        .from('staff_members')
        .select('id, display_name')
        .eq('clinic_id', clinicId)
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('display_name'),
      supabase
        .from('patients')
        .select('id, name_kanji')
        .eq('clinic_id', clinicId)
        .is('deleted_at', null)
        .order('name_kanji'),
      supabase
        .from('visits')
        .select(
          'id, patient_id, team_id, staff_id, start_time, end_time, status, source, metadata, patients(name_kanji)',
        )
        .eq('clinic_id', clinicId)
        .eq('scheduled_date', date)
        .is('deleted_at', null)
        .neq('status', 'cancelled')
        .order('start_time'),
      supabase
        .from('visits')
        .select('team_id')
        .eq('clinic_id', clinicId)
        .is('deleted_at', null)
        .neq('status', 'cancelled')
        .not('team_id', 'is', null),
      supabase
        .from('calendar_blocks')
        .select('id, team_id, start_time, end_time, block_type, title')
        .eq('clinic_id', clinicId)
        .eq('scheduled_date', date)
        .is('deleted_at', null)
        .order('start_time'),
      supabase
        .from('clinic_day_memos')
        .select('body')
        .eq('clinic_id', clinicId)
        .eq('memo_date', date)
        .is('deleted_at', null)
        .maybeSingle(),
      supabase
        .from('visits')
        .select('id', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)
        .eq('scheduled_date', date)
        .eq('status', 'cancelled')
        .is('deleted_at', null),
      supabase
        .from('clinics')
        .select('metadata')
        .eq('id', clinicId)
        .is('deleted_at', null)
        .maybeSingle(),
    ])

    if (!isLatestCalendarDayLoad(seq, loadSeqRef.current)) return
    if (shouldClearCalendarDayLoading({ isLatest: true, silent })) {
      setLoading(false)
    }

    if (staffRes.error || patientsRes.error || visitsRes.error) {
      setError(
        staffRes.error?.message ||
          patientsRes.error?.message ||
          visitsRes.error?.message ||
          '読込に失敗しました',
      )
      return
    }

    setStaff(staffRes.data ?? [])
    setPatients(patientsRes.data ?? [])
    setVisits(
      ((visitsRes.data ?? []) as VisitRow[]).map((row) => ({
        ...row,
        cell_color: readVisitCellColor(row.metadata),
      })),
    )
    setBlocks((blocksRes.data ?? []) as CalendarBlock[])
    setDayMemo(memoRes.data?.body ?? '')
    setCancelledCount(cancelledRes.count ?? 0)
    setVisitMenuEnabled(readVisitMenuEnabled(clinicRes.data?.metadata ?? null))

    setVisibleColumns((current) => {
      const stored = readStoredVisibleColumns(clinicId) ?? current
      const next = resolveVisibleColumns({
        stored,
        teams: ensured.teams,
        usedTeamIds: usedTeamsRes.error
          ? []
          : (usedTeamsRes.data ?? []).map((row) => row.team_id),
      })
      if (next > stored) writeStoredVisibleColumns(clinicId, next)
      return next
    })
    setError(null)
  }, [clinicId, date])

  const patchVisitLocal = useCallback((visitId: string, patch: VisitLocalPatch) => {
    setVisits((current) =>
      current.map((visit) =>
        visit.id === visitId ? { ...visit, ...patch } : visit,
      ),
    )
  }, [])

  const patchVisitsLocal = useCallback(
    (visitIds: string[], patch: VisitLocalPatch) => {
      if (visitIds.length === 0) return
      const idSet = new Set(visitIds)
      setVisits((current) =>
        current.map((visit) =>
          idSet.has(visit.id) ? { ...visit, ...patch } : visit,
        ),
      )
    },
    [],
  )

  const removeVisitsLocal = useCallback((visitIds: string[]) => {
    if (visitIds.length === 0) return
    const idSet = new Set(visitIds)
    setVisits((current) => current.filter((visit) => !idSet.has(visit.id)))
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return {
    visibleColumns,
    allTeams,
    staff,
    patients,
    visits,
    blocks,
    cancelledCount,
    visitMenuEnabled,
    dayMemo,
    setDayMemo,
    loading,
    error,
    setError,
    load,
    patchVisitLocal,
    patchVisitsLocal,
    removeVisitsLocal,
  }
}
