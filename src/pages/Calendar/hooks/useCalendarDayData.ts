import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { supabase } from '@/lib/supabase'
import type { Json } from '@/types/database.types'
import { readVisitMenuEnabled } from '@/utils/clinic/clinicMetadata'
import { readHasInfectiousDisease } from '@/pages/Patients/infectiousDiseasePolicy'
import { readVisitCellColor } from '@/utils/visitMenus/visitCellColor'
import { VISIT_MENU_CATALOG, type VisitMenuItem } from '@/utils/visitMenus/visitMenuCatalog'
import {
  enabledMapFromMenus,
  ensureClinicVisitMenus,
} from '@/utils/visitMenus/clinicVisitMenus'
import type { CalendarBlock, CalendarVisit } from '@/pages/Calendar/components/DayVisitGrid'
import {
  ensureVehicleTeams,
  type VehicleTeam,
} from '@/pages/Calendar/utils/ensureVehicleTeams'
import { INITIAL_VISIBLE_VEHICLE_COLUMNS } from '@/pages/Calendar/utils/vehicleTeams'
import {
  isLatestCalendarDayLoad,
  shouldClearCalendarDayLoading,
  shouldUseCalendarDayOnlyReload,
} from '@/pages/Calendar/hooks/calendarDayLoadState'
import { useCalendarRealtimeSync } from '@/pages/Calendar/hooks/useCalendarRealtimeSync'
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
  const [visitMenuCatalog, setVisitMenuCatalog] = useState<VisitMenuItem[]>([
    ...VISIT_MENU_CATALOG,
  ])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loadSeqRef = useRef(0)
  const allTeamsRef = useRef<VehicleTeam[]>([])
  const allTeamsClinicRef = useRef<string | undefined>(undefined)

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
    if (allTeamsClinicRef.current !== clinicId) {
      allTeamsClinicRef.current = clinicId
      allTeamsRef.current = []
    }

    const dayOnly = shouldUseCalendarDayOnlyReload({
      silent,
      hasTeams: allTeamsRef.current.length > 0,
    })

    let teams = allTeamsRef.current
    if (!dayOnly) {
      const ensured = await ensureVehicleTeams(clinicId)
      if (!isLatestCalendarDayLoad(seq, loadSeqRef.current)) return
      if (ensured.error) {
        if (shouldClearCalendarDayLoading({ isLatest: true, silent })) {
          setLoading(false)
        }
        setError(ensured.error)
        return
      }
      teams = ensured.teams
      allTeamsRef.current = teams
      setAllTeams(teams)
    }

    const visitsQuery = supabase
      .from('visits')
      .select(
        'id, patient_id, team_id, staff_id, start_time, end_time, status, source, metadata, patients(name_kanji, has_infectious_disease)',
      )
      .eq('clinic_id', clinicId)
      .eq('scheduled_date', date)
      .is('deleted_at', null)
      .neq('status', 'cancelled')
      .order('start_time')
    const blocksQuery = supabase
      .from('calendar_blocks')
      .select('id, team_id, start_time, end_time, block_type, title')
      .eq('clinic_id', clinicId)
      .eq('scheduled_date', date)
      .is('deleted_at', null)
      .order('start_time')
    const memoQuery = supabase
      .from('clinic_day_memos')
      .select('body')
      .eq('clinic_id', clinicId)
      .eq('memo_date', date)
      .is('deleted_at', null)
      .maybeSingle()
    const cancelledQuery = supabase
      .from('visits')
      .select('id', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .eq('scheduled_date', date)
      .eq('status', 'cancelled')
      .is('deleted_at', null)

    if (dayOnly) {
      const [visitsRes, blocksRes, memoRes, cancelledRes] = await Promise.all([
        visitsQuery,
        blocksQuery,
        memoQuery,
        cancelledQuery,
      ])
      if (!isLatestCalendarDayLoad(seq, loadSeqRef.current)) return
      if (shouldClearCalendarDayLoading({ isLatest: true, silent })) {
        setLoading(false)
      }
      if (visitsRes.error) {
        setError(visitsRes.error.message || '読込に失敗しました')
        return
      }
      applyCalendarDaySurface({
        clinicId,
        teams,
        visits: (visitsRes.data ?? []) as VisitRow[],
        blocks: (blocksRes.data ?? []) as CalendarBlock[],
        dayMemo: memoRes.data?.body ?? '',
        cancelledCount: cancelledRes.count ?? 0,
        usedTeamIds: ((visitsRes.data ?? []) as VisitRow[]).map((row) => row.team_id),
        setVisits,
        setBlocks,
        setDayMemo,
        setCancelledCount,
        setVisibleColumns,
      })
      setError(null)
      return
    }

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
      visitsQuery,
      supabase
        .from('visits')
        .select('team_id')
        .eq('clinic_id', clinicId)
        .is('deleted_at', null)
        .neq('status', 'cancelled')
        .not('team_id', 'is', null),
      blocksQuery,
      memoQuery,
      cancelledQuery,
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
    applyCalendarDaySurface({
      clinicId,
      teams,
      visits: (visitsRes.data ?? []) as VisitRow[],
      blocks: (blocksRes.data ?? []) as CalendarBlock[],
      dayMemo: memoRes.data?.body ?? '',
      cancelledCount: cancelledRes.count ?? 0,
      usedTeamIds: usedTeamsRes.error
        ? []
        : (usedTeamsRes.data ?? []).map((row) => row.team_id),
      setVisits,
      setBlocks,
      setDayMemo,
      setCancelledCount,
      setVisibleColumns,
    })
    const metadata = clinicRes.data?.metadata ?? null
    const menus = await ensureClinicVisitMenus({
      clinicId,
      metadata,
      userId: null,
    })
    if (!isLatestCalendarDayLoad(seq, loadSeqRef.current)) return
    if (menus.items.length > 0) {
      setVisitMenuCatalog(menus.items)
      setVisitMenuEnabled(enabledMapFromMenus(menus.items))
    } else {
      setVisitMenuCatalog([...VISIT_MENU_CATALOG])
      setVisitMenuEnabled(readVisitMenuEnabled(metadata))
    }
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

  useCalendarRealtimeSync(clinicId, date, load)

  return {
    visibleColumns,
    allTeams,
    staff,
    patients,
    visits,
    blocks,
    cancelledCount,
    visitMenuEnabled,
    visitMenuCatalog,
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

function applyCalendarDaySurface(input: {
  clinicId: string
  teams: VehicleTeam[]
  visits: VisitRow[]
  blocks: CalendarBlock[]
  dayMemo: string
  cancelledCount: number
  usedTeamIds: Array<string | null | undefined>
  setVisits: Dispatch<SetStateAction<VisitRow[]>>
  setBlocks: Dispatch<SetStateAction<CalendarBlock[]>>
  setDayMemo: Dispatch<SetStateAction<string>>
  setCancelledCount: Dispatch<SetStateAction<number>>
  setVisibleColumns: Dispatch<SetStateAction<number>>
}) {
  input.setVisits(
    input.visits.map((row) => ({
      ...row,
      cell_color: readVisitCellColor(row.metadata),
      patients: row.patients
        ? {
            name_kanji: row.patients.name_kanji,
            has_infectious_disease: readHasInfectiousDisease(
              row.patients.has_infectious_disease,
            ),
          }
        : null,
    })),
  )
  input.setBlocks(input.blocks)
  input.setDayMemo(input.dayMemo)
  input.setCancelledCount(input.cancelledCount)
  input.setVisibleColumns((current) => {
    const stored = readStoredVisibleColumns(input.clinicId) ?? current
    const next = resolveVisibleColumns({
      stored,
      teams: input.teams,
      usedTeamIds: input.usedTeamIds,
    })
    if (next > stored) writeStoredVisibleColumns(input.clinicId, next)
    return next
  })
}
