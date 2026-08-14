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
import {
  VisitCreateModal,
  type VisitCreateForm,
} from '@/pages/Calendar/components/VisitCreateModal'
import { VisitDetailModal } from '@/pages/Calendar/components/VisitDetailModal'
import { useCalendarDayData } from '@/pages/Calendar/hooks/useCalendarDayData'
import {
  asSubmit,
  cancelVisit,
  clearAutoProposalTentatives,
  confirmAutoProposalTentatives,
  confirmTentativeVisit,
  createTentativeAutoProposal,
  createVisitOrBlock,
  duplicateVisitAfter,
  persistMoveVisit,
  persistResizeVisit,
  saveDayMemo,
  softDeleteBlock,
  updateVisitDetail,
} from '@/pages/Calendar/hooks/useCalendarVisitActions'
import { isAutoProposalTentative } from '@/pages/Calendar/utils/visitBlockAppearance'
import { ComposingOrb } from '@/components/ui/ComposingOrb'
import { AiComposingOverlay } from '@/pages/Calendar/components/AiComposingOverlay'
import { useProposeProgress } from '@/pages/Calendar/hooks/useProposeProgress'
import { runCalendarAutoPropose } from '@/features/calendar/runCalendarAutoPropose'
import { todayISO } from '@/utils/dates'

type VisitRow = CalendarVisit & { patient_id: string; staff_id: string | null }

const CREATE_FORM: VisitCreateForm = {
  patient_id: '',
  team_id: '',
  staff_id: '',
  start_time: '09:00',
  end_time: '09:30',
  mode: 'visit',
  block_type: 'break',
  block_title: '',
}

export function CalendarPage() {
  const { user } = useAuth()
  const { clinic, membership, isPlatformAdmin, canWriteOperations, clinicReady } =
    useClinic()
  const toast = useToast()
  const [date, setDate] = useState(todayISO())
  const data = useCalendarDayData(clinic?.id, date)

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<VisitCreateForm>(CREATE_FORM)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedVisit, setSelectedVisit] = useState<VisitRow | null>(null)
  const [detailTeamId, setDetailTeamId] = useState('')
  const [detailStart, setDetailStart] = useState('09:00')
  const [detailEnd, setDetailEnd] = useState('09:30')
  const [patientFilter, setPatientFilter] = useState('')
  const [busy, setBusy] = useState(false)
  const [memoSaving, setMemoSaving] = useState(false)
  const [aiProposeBusy, setAiProposeBusy] = useState(false)
  const proposeProgress = useProposeProgress()
  const [gapFillOpen, setGapFillOpen] = useState(false)
  const [gapFillSeed, setGapFillSeed] = useState<GapFillSeed | null>(null)

  const canPropose =
    isPlatformAdmin ||
    (!!membership && ['owner', 'admin', 'coordinator'].includes(membership.role))

  useEffect(() => {
    if (!data.error) return
    toast.error(data.error)
    data.setError(null)
  }, [data.error, data.setError, toast])

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
    if (aiProposeBusy) return
    void (async () => {
      setAiProposeBusy(true)
      proposeProgress.start()
      try {
        const result = await runCalendarAutoPropose({
          clinicId: clinic.id,
          targetDate: date,
          vehicleTeamIds: teams.map((team) => team.id),
        })
        toast.success(
          `仮予約を${result.adoptedCount}件登録しました（提案${result.generatedCount}件）`,
        )
        await data.load()
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '自動提案に失敗しました'
        const hint =
          message.includes('割付対象') || message.includes('0件')
            ? ' 「空きを埋める」から個別枠を探せます。'
            : ''
        toast.error(`${message}${hint}`)
      } finally {
        proposeProgress.finish()
        setAiProposeBusy(false)
      }
    })()
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

  const openCreate = (teamId: string, startTime: string, endTime: string) => {
    if (!canWriteOperations) return
    setCreateForm({
      ...CREATE_FORM,
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
    setDetailTeamId(row.team_id ?? '')
    setDetailStart(String(row.start_time).slice(0, 5))
    setDetailEnd(String(row.end_time).slice(0, 5))
    setDetailOpen(true)
  }

  /** 仮予約クリック → 本予約確定。本予約は詳細モーダル */
  const handleSelectVisit = (visit: CalendarVisit) => {
    if (!actionCtx) {
      openDetail(visit)
      return
    }
    if (visit.status !== 'tentative') {
      openDetail(visit)
      return
    }
    if (!canWriteOperations) {
      toast.error('確定する権限がありません')
      return
    }
    /** 二重クリックで詳細が開かないよう、先に楽観更新してから確定 */
    data.patchVisitLocal(visit.id, { status: 'confirmed' })
    void confirmTentativeVisit(actionCtx, visit.id)
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
          />
          {/* actions スロットに分けると右端へ寄るため、日付ナビと同じ行に続ける */}
          <div className="flex shrink-0 flex-nowrap items-center gap-2">
            <ClearAutoProposalsConfirm
              count={autoProposalCount}
              busy={busy}
              disabled={aiProposeBusy || !canWriteOperations}
              onConfirm={runClearAutoProposals}
            />
            <ConfirmAutoProposalsConfirm
              count={autoProposalCount}
              busy={busy}
              disabled={aiProposeBusy || !canWriteOperations}
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
                disabled={aiProposeBusy || busy || !canWriteOperations}
                onAdopt={async (input) => {
                  if (!actionCtx) return false
                  return createTentativeAutoProposal(actionCtx, input)
                }}
                onOpenManualCreate={(seed) => {
                  openCreate(seed.teamId, seed.startTime, seed.endTime)
                }}
              />
            ) : null}
            <button
              type="button"
              disabled={aiProposeBusy}
              aria-busy={aiProposeBusy}
              aria-label="自動提案"
              className={[
                'relative inline-flex shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full font-bold transition',
                'bg-slate-100 px-3 py-1.5 text-xs text-slate-700',
                'hover:bg-slate-200/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-300/50',
                'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
              ].join(' ')}
              onClick={runAiPropose}
            >
              {proposeProgress.active ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 bg-[#008C01]/15 transition-[width] duration-200 ease-linear"
                  style={{ width: `${proposeProgress.percent}%` }}
                />
              ) : null}
              <span className="relative inline-flex items-center gap-1">
                {proposeProgress.active ? (
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
                  {aiProposeBusy || proposeProgress.active
                    ? `提案中… ${proposeProgress.percent}%`
                    : '自動提案'}
                </span>
              </span>
            </button>
          </div>
        </div>
      }
    >
      <div className="flex h-full min-h-0 flex-col gap-1.5">
        <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <DayVisitGrid
            viewDate={date}
            teams={teams}
            visits={filteredVisits}
            blocks={data.blocks}
            loading={data.loading || aiProposeBusy}
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
          />
          {aiProposeBusy ? <AiComposingOverlay /> : null}
        </section>
      </div>

      <VisitCreateModal
        open={createOpen}
        busy={busy}
        date={date}
        form={createForm}
        patientOptions={patientOptions}
        teamOptions={teamOptions}
        staffOptions={staffOptions}
        onClose={() => setCreateOpen(false)}
        onChange={setCreateForm}
        onSubmit={asSubmit(async () => {
          if (!actionCtx) return
          const ok = await createVisitOrBlock(actionCtx, createForm, {
            start: CREATE_FORM.start_time,
            end: CREATE_FORM.end_time,
          })
          if (ok) setCreateOpen(false)
        })}
      />

      <VisitDetailModal
        open={detailOpen}
        busy={busy}
        patientName={selectedVisit?.patients?.name_kanji ?? '患者不明'}
        teamId={detailTeamId}
        startTime={detailStart}
        endTime={detailEnd}
        teamOptions={teamOptions}
        onClose={() => setDetailOpen(false)}
        onChangeTeam={setDetailTeamId}
        onChangeStart={setDetailStart}
        onChangeEnd={setDetailEnd}
        onSubmit={asSubmit(async () => {
          if (!actionCtx || !selectedVisit) return
          const ok = await updateVisitDetail(actionCtx, selectedVisit.id, {
            teamId: detailTeamId,
            startTime: detailStart,
            endTime: detailEnd,
          })
          if (ok) setDetailOpen(false)
        })}
        onCancel={() => {
          if (!actionCtx || !selectedVisit) return
          void cancelVisit(actionCtx, selectedVisit.id).then((ok) => {
            if (ok) setDetailOpen(false)
          })
        }}
        onCopyNext={() => {
          if (!actionCtx || !selectedVisit) return
          void duplicateVisitAfter(actionCtx, selectedVisit, {
            teamId: detailTeamId,
            startTime: detailStart,
            endTime: detailEnd,
          }).then((ok) => {
            if (ok) setDetailOpen(false)
          })
        }}
      />
    </DashboardLayout>
  )
}
