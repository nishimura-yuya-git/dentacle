import { useEffect, useMemo, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/features/auth/useAuth'
import { ClinicAccessPlaceholder } from '@/features/clinic/ClinicAccessPlaceholder'
import { useClinic } from '@/features/clinic/useClinic'
import { CalendarDateControls } from '@/pages/Calendar/components/CalendarDateControls'
import { ClearAutoProposalsConfirm } from '@/pages/Calendar/components/ClearAutoProposalsConfirm'
import { ConfirmAutoProposalsConfirm } from '@/pages/Calendar/components/ConfirmAutoProposalsConfirm'
import {
  GapFillPanel,
  type GapFillSeed,
} from '@/pages/Calendar/components/GapFillPanel'
import {
  DayVisitGrid,
  type CalendarVisit,
} from '@/pages/Calendar/components/DayVisitGrid'
import { CalendarVisitModals } from '@/pages/Calendar/components/CalendarVisitModals'
import {
  EMPTY_VISIT_CREATE_FORM,
  type VisitCreateForm,
} from '@/pages/Calendar/components/VisitCreateModal'
import { useCalendarDayData, type VisitRow } from '@/pages/Calendar/hooks/useCalendarDayData'
import { useCalendarLivePeers } from '@/pages/Calendar/hooks/useCalendarLivePeers'
import {
  clearAutoProposalTentatives,
  confirmAutoProposalTentatives,
  createTentativeAutoProposal,
  persistMoveVisit,
  persistResizeVisit,
  saveDayMemo,
  softDeleteBlock,
} from '@/pages/Calendar/hooks/useCalendarVisitActions'
import { DEFAULT_VISIT_CELL_COLOR, readVisitCellColor } from '@/utils/visitMenus/visitCellColor'
import {
  EMPTY_VISIT_MENU_FORM,
  visitMenusToForm,
  readVisitMenus,
} from '@/utils/visitMenus/visitMenuState'
import { isAutoProposalTentative } from '@/pages/Calendar/utils/visitBlockAppearance'
import { shouldOpenDetailOnVisitClick } from '@/pages/Calendar/utils/visitClickAction'
import { ComposingOrb } from '@/components/ui/ComposingOrb'
import { AiComposingOverlay } from '@/pages/Calendar/components/AiComposingOverlay'
import {
  AUTO_PROPOSE_NOTE,
  isAutoProposeRunning,
  shouldReloadCalendarAfterPropose,
  shouldShowCalendarProposeOverlay,
} from '@/features/calendar/autoProposeJob'
import { useAutoProposeJob } from '@/features/calendar/useAutoProposeJob'
import { todayISO } from '@/utils/dates'

export function CalendarPage() {
  const { user } = useAuth()
  const { clinic, membership, isPlatformAdmin, canWriteOperations, clinicReady } =
    useClinic()
  const toast = useToast()
  const autoPropose = useAutoProposeJob()
  const [date, setDate] = useState(todayISO())
  const data = useCalendarDayData(clinic?.id, date)

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<VisitCreateForm>(EMPTY_VISIT_CREATE_FORM)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedVisit, setSelectedVisit] = useState<VisitRow | null>(null)
  const [detailStaffId, setDetailStaffId] = useState('')
  const [detailTeamId, setDetailTeamId] = useState('')
  const [detailStart, setDetailStart] = useState('09:00')
  const [detailEnd, setDetailEnd] = useState('09:30')
  const [detailMenus, setDetailMenus] = useState(EMPTY_VISIT_MENU_FORM)
  const [detailCellColor, setDetailCellColor] = useState(DEFAULT_VISIT_CELL_COLOR)
  const [patientFilter, setPatientFilter] = useState('')
  const [busy, setBusy] = useState(false)
  const [memoSaving, setMemoSaving] = useState(false)
  const [gapFillOpen, setGapFillOpen] = useState(false)
  const [gapFillSeed, setGapFillSeed] = useState<GapFillSeed | null>(null)
  const live = useCalendarLivePeers({
    clinicId: clinic?.id,
    userId: user?.id,
    date,
    detailVisitId: detailOpen ? selectedVisit?.id ?? null : null,
    createPreview:
      createOpen && createForm.team_id
        ? {
            teamId: createForm.team_id,
            startTime: createForm.start_time,
            endTime: createForm.end_time,
          }
        : null,
  })

  const canPropose =
    isPlatformAdmin ||
    (!!membership && ['owner', 'admin', 'coordinator'].includes(membership.role))

  const proposeBusy = isAutoProposeRunning(autoPropose.phase)
  const showProposeOverlay = shouldShowCalendarProposeOverlay({
    phase: autoPropose.phase,
    jobClinicId: autoPropose.clinicId,
    viewingClinicId: clinic?.id,
    jobTargetDate: autoPropose.targetDate,
    viewingDate: date,
  })

  useEffect(() => {
    if (!data.error) return
    toast.error(data.error)
    data.setError(null)
  }, [data.error, data.setError, toast])

  useEffect(() => {
    const result = autoPropose.lastResult
    if (!result?.ok) return
    if (
      !shouldReloadCalendarAfterPropose({
        resultClinicId: result.clinicId,
        resultTargetDate: result.targetDate,
        viewingClinicId: clinic?.id,
        viewingDate: date,
      })
    ) {
      return
    }
    void data.load({ silent: true })
  }, [autoPropose.lastResult, clinic?.id, data.load, date])

  const teams = useMemo(
    () => data.allTeams.slice(0, data.visibleColumns),
    [data.allTeams, data.visibleColumns],
  )

  const runAiPropose = () => {
    if (!clinic || !user) return
    if (!canPropose) {
      toast.error('提案の実行はオーナー / 管理者 / コーディネーターのみ可能です')
      return
    }
    autoPropose.start({
      clinicId: clinic.id,
      targetDate: date,
      vehicleTeamIds: teams.map((team) => team.id),
    })
  }
  const teamOptions = useMemo(
    () => teams.map((team) => ({ value: team.id, label: team.name })),
    [teams],
  )
  const patientOptions = useMemo(
    () => [
      { value: '', label: '選択してください' },
      ...data.patients.map((p) => ({ value: p.id, label: p.name_kanji })),
    ],
    [data.patients],
  )
  const staffOptions = useMemo(
    () => [
      { value: '', label: '未指定' },
      ...data.staff.map((s) => ({ value: s.id, label: s.display_name })),
    ],
    [data.staff],
  )
  const filteredVisits = useMemo(() => {
    const q = patientFilter.trim()
    if (!q) return data.visits
    return data.visits.filter((visit) =>
      (visit.patients?.name_kanji ?? '').includes(q),
    )
  }, [data.visits, patientFilter])

  const autoProposalCount = useMemo(
    () => data.visits.filter((visit) => isAutoProposalTentative(visit)).length,
    [data.visits],
  )

  const actionCtx =
    clinic && user
      ? {
          clinicId: clinic.id,
          userId: user.id,
          date,
          canWrite: canWriteOperations,
          setBusy,
          setError: (value: string | null) => {
            if (value) toast.error(value)
          },
          setMessage: (value: string | null) => {
            if (value) toast.success(value)
          },
          reload: data.load,
          patchVisitLocal: data.patchVisitLocal,
          patchVisitsLocal: data.patchVisitsLocal,
          removeVisitsLocal: data.removeVisitsLocal,
        }
      : null

  const runClearAutoProposals = async () => {
    if (!actionCtx) return
    if (!canWriteOperations) {
      toast.error('クリアする権限がありません')
      return
    }
    if (autoProposalCount === 0) {
      toast.error('クリアする自動提案の仮予約がありません')
      return
    }
    setBusy(true)
    const count = await clearAutoProposalTentatives(actionCtx)
    setBusy(false)
    if (count > 0) {
      toast.success(`自動提案の仮予約を ${count} 件クリアしました`)
    }
  }

  const runConfirmAutoProposals = async () => {
    if (!actionCtx) return
    if (!canWriteOperations) {
      toast.error('確定する権限がありません')
      return
    }
    if (autoProposalCount === 0) {
      toast.error('確定する自動提案の仮予約がありません')
      return
    }
    const ids = data.visits
      .filter((visit) => isAutoProposalTentative(visit))
      .map((visit) => visit.id)
    data.patchVisitsLocal(ids, { status: 'confirmed' })
    setBusy(true)
    const count = await confirmAutoProposalTentatives(actionCtx)
    setBusy(false)
    if (count > 0) {
      toast.success(`自動提案の仮予約を ${count} 件本予約にしました`)
    }
  }

  const openCreate = (
    teamId: string,
    startTime: string,
    endTime: string,
    mode: 'visit' | 'block' = 'visit',
  ) => {
    if (!canWriteOperations) return
    setCreateForm({
      ...EMPTY_VISIT_CREATE_FORM,
      mode,
      team_id: teamId,
      start_time: startTime.slice(0, 5),
      end_time: endTime.slice(0, 5),
    })
    setCreateOpen(true)
  }

  /** 空きセル選択 → 空き枠埋めパネル（手動登録はパネル内導線） */
  const openGapFillFromSlot = (
    teamId: string,
    startTime: string,
    endTime: string,
  ) => {
    if (!canPropose || !canWriteOperations) {
      openCreate(teamId, startTime, endTime)
      return
    }
    setGapFillSeed({
      teamId,
      startTime: startTime.slice(0, 5),
      endTime: endTime.slice(0, 5),
    })
    setGapFillOpen(true)
  }

  const openDetail = (visit: CalendarVisit) => {
    const row = data.visits.find((item) => item.id === visit.id) ?? null
    if (!row) return
    setSelectedVisit(row)
    setDetailStaffId(row.staff_id ?? '')
    setDetailTeamId(row.team_id ?? '')
    setDetailStart(String(row.start_time).slice(0, 5))
    setDetailEnd(String(row.end_time).slice(0, 5))
    setDetailMenus(visitMenusToForm(readVisitMenus(row.metadata)))
    setDetailCellColor(readVisitCellColor(row.metadata))
    setDetailOpen(true)
  }

  /** 仮予約も本予約も詳細を開く。確定は詳細の主操作 */
  const handleSelectVisit = (visit: CalendarVisit) => {
    if (!shouldOpenDetailOnVisitClick(visit.status)) return
    openDetail(visit)
  }

  if (!clinicReady) {
    return (
      <DashboardLayout title="">
        <ClinicAccessPlaceholder />
      </DashboardLayout>
    )
  }

  if (!clinic) {
    return (
      <DashboardLayout title="">
        <p className="text-sm text-slate-500">クリニックを選択または作成してください。</p>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      title=""
      fillViewport
      titleAside={
        <div className="flex shrink-0 flex-nowrap items-center gap-3">
          <CalendarDateControls
            clinicId={clinic.id}
            date={date}
            onDateChange={setDate}
            patientFilter={patientFilter}
            onPatientFilterChange={setPatientFilter}
            cancelledCount={data.cancelledCount}
            dayMemo={data.dayMemo}
            memoSaving={memoSaving}
            onMemoSave={async (body) => {
              if (!actionCtx) return false
              setMemoSaving(true)
              data.setDayMemo(body)
              const ok = await saveDayMemo(actionCtx, body)
              setMemoSaving(false)
              return ok
            }}
            livePeers={live.others}
          />
          {/* actions スロットに分けると右端へ寄るため、日付ナビと同じ行に続ける */}
          <div className="flex shrink-0 flex-nowrap items-center gap-2">
            <ClearAutoProposalsConfirm
              count={autoProposalCount}
              busy={busy}
              disabled={proposeBusy || !canWriteOperations}
              onConfirm={runClearAutoProposals}
            />
            <ConfirmAutoProposalsConfirm
              count={autoProposalCount}
              busy={busy}
              disabled={proposeBusy || !canWriteOperations}
              onConfirm={runConfirmAutoProposals}
            />
            {canPropose && clinic ? (
              <GapFillPanel
                open={gapFillOpen}
                onOpenChange={(next) => {
                  setGapFillOpen(next)
                  if (!next) setGapFillSeed(null)
                }}
                seed={gapFillSeed}
                clinicId={clinic.id}
                targetDate={date}
                vehicleTeamIds={teams.map((team) => team.id)}
                teamOptions={teamOptions}
                patients={data.patients}
                disabled={proposeBusy || busy || !canWriteOperations}
                onAdopt={async (input) => {
                  if (!actionCtx) return false
                  return createTentativeAutoProposal(actionCtx, input)
                }}
                onOpenManualCreate={(seed, mode) => {
                  openCreate(seed.teamId, seed.startTime, seed.endTime, mode)
                }}
              />
            ) : null}
            <button
              type="button"
              disabled={proposeBusy}
              aria-busy={proposeBusy}
              aria-label="自動提案"
              className={[
                'relative inline-flex shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full font-bold transition',
                'bg-slate-100 px-3 py-1.5 text-xs text-slate-700',
                'hover:bg-slate-200/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-300/50',
                'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
              ].join(' ')}
              onClick={runAiPropose}
            >
              {autoPropose.progressActive ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 bg-[#008C01]/15 transition-[width] duration-200 ease-linear"
                  style={{ width: `${autoPropose.percent}%` }}
                />
              ) : null}
              <span className="relative inline-flex items-center gap-1">
                {autoPropose.progressActive ? (
                  <ComposingOrb size={20} label="提案を作成しています" />
                ) : (
                  <img
                    src="/icon/ai.png"
                    alt=""
                    width={14}
                    height={14}
                    className="h-3.5 w-3.5 shrink-0 brightness-0 opacity-45"
                  />
                )}
                <span className="tabular-nums">
                  {proposeBusy || autoPropose.progressActive
                    ? `提案中… ${autoPropose.percent}%`
                    : '自動提案'}
                </span>
              </span>
            </button>
          </div>
        </div>
      }
    >
      <div className="flex h-full min-h-0 flex-col gap-1.5">
        <p className="shrink-0 text-right text-[11px] font-medium text-slate-400">
          {AUTO_PROPOSE_NOTE}
        </p>
        <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <DayVisitGrid
            viewDate={date}
            teams={teams}
            visits={filteredVisits}
            blocks={data.blocks}
            loading={data.loading || showProposeOverlay}
            onSelectVisit={handleSelectVisit}
            onSelectBlock={(block) => {
              if (actionCtx) void softDeleteBlock(actionCtx, block)
            }}
            onEmptySlotSelect={openGapFillFromSlot}
            onMoveVisit={
              canWriteOperations && actionCtx
                ? (visitId, teamId, startTime, endTime) =>
                    void persistMoveVisit(
                      actionCtx,
                      visitId,
                      teamId,
                      startTime,
                      endTime,
                    )
                : undefined
            }
            onResizeVisit={
              canWriteOperations && actionCtx
                ? (visitId, _start, endTime) =>
                    void persistResizeVisit(actionCtx, visitId, endTime)
                : undefined
            }
            livePeers={live.others}
            onLiveDragChange={live.setGridDrag}
          />
          {showProposeOverlay ? <AiComposingOverlay /> : null}
        </section>
      </div>

      <CalendarVisitModals
        createOpen={createOpen}
        createForm={createForm}
        detailOpen={detailOpen}
        busy={busy}
        date={date}
        patientName={selectedVisit?.patients?.name_kanji ?? '患者不明'}
        selectedVisit={selectedVisit}
        staffId={detailStaffId}
        teamId={detailTeamId}
        startTime={detailStart}
        endTime={detailEnd}
        menus={detailMenus}
        cellColor={detailCellColor}
        menuEnabled={data.visitMenuEnabled}
        patientOptions={patientOptions}
        teamOptions={teamOptions}
        staffOptions={staffOptions}
        actionCtx={actionCtx}
        onCloseCreate={() => setCreateOpen(false)}
        onChangeCreate={setCreateForm}
        onCloseDetail={() => setDetailOpen(false)}
        onChangeStaff={setDetailStaffId}
        onChangeTeam={setDetailTeamId}
        onChangeStart={setDetailStart}
        onChangeEnd={setDetailEnd}
        onChangeMenus={setDetailMenus}
        onChangeCellColor={setDetailCellColor}
      />
    </DashboardLayout>
  )
}
