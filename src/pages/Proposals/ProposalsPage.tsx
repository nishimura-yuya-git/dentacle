import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/features/auth/useAuth'
import { ClinicAccessPlaceholder } from '@/features/clinic/ClinicAccessPlaceholder'
import { useClinic } from '@/features/clinic/useClinic'
import { supabase } from '@/lib/supabase'
import { todayISO } from '@/utils/dates'
import { getProposalLanePreset } from '@/utils/schedule/proposalLanePresets'
import { useAiUsageDashboard } from '@/pages/Admin/hooks/useAiUsageDashboard'
import { AiUsageJobsTable } from '@/pages/Admin/sections/AiUsageJobsTable'
import {
  adoptJobItem,
  generateDay0Job,
  rejectJobItem,
} from './hooks/proposalActions'
import type { PlatformAiView } from './PlatformAiViewSelect'
import { GenerateProposalSection } from './sections/GenerateProposalSection'
import { ProposalItemsSection } from './sections/ProposalItemsSection'
import { RecentJobsSection } from './sections/RecentJobsSection'
import type { JobItem, JobRow, Team } from './types'
import {
  buildRecentJobsClinicFilterOptions,
  filterRecentJobsByClinic,
} from './utils/filterRecentJobs'

type ProposalSection = 'conditions' | 'jobs' | 'items'

type JobQueryRow = {
  id: string
  clinic_id: string
  target_date: string
  team_id: string | null
  status: string
  created_at: string
  result_snapshot: JobRow['result_snapshot']
  clinics: { name: string } | { name: string }[] | null
  teams: { name: string } | { name: string }[] | null
}

const VIEW_OPTIONS = [
  { value: 'proposals', label: '自動提案' },
  { value: 'usage', label: 'AI利用状況' },
] as const

const SECTION_OPTIONS = [
  { value: 'conditions', label: '条件設定' },
  { value: 'jobs', label: '最近のジョブ' },
  { value: 'items', label: '提案内容' },
] as const

function viewFromSearch(params: URLSearchParams): PlatformAiView {
  return params.get('view') === 'usage' ? 'usage' : 'proposals'
}

function relationName(
  value: { name: string } | { name: string }[] | null,
): string | null {
  if (!value) return null
  if (Array.isArray(value)) return value[0]?.name ?? null
  return value.name
}

/**
 * 運営向けハブ: 自動提案と AI利用状況を見出し Select で切替。
 * URL: `/proposals` / `/proposals?view=usage`
 */
export function ProposalsPage() {
  const { user } = useAuth()
  const { clinic, clinics, isPlatformAdmin, clinicReady } = useClinic()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const view = viewFromSearch(searchParams)
  const usage = useAiUsageDashboard()
  /** 運営専用画面。ジョブ操作も platform admin のみ */
  const canPropose = isPlatformAdmin

  const [targetDate, setTargetDate] = useState(todayISO())
  const [teamId, setTeamId] = useState('')
  const [teams, setTeams] = useState<Team[]>([])
  const [jobs, setJobs] = useState<JobRow[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [items, setItems] = useState<JobItem[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [section, setSection] = useState<ProposalSection>('conditions')
  const [clinicFilter, setClinicFilter] = useState('')

  const setView = useCallback(
    (next: PlatformAiView) => {
      if (next === 'usage') {
        setSearchParams({ view: 'usage' }, { replace: true })
        return
      }
      setSearchParams({}, { replace: true })
    },
    [setSearchParams],
  )

  const loadTeams = useCallback(async () => {
    if (!clinic) {
      setTeams([])
      return
    }
    const { data, error: queryError } = await supabase
      .from('teams')
      .select('id, name')
      .eq('clinic_id', clinic.id)
      .is('deleted_at', null)
      .order('sort_order')
    if (queryError) {
      toast.error(queryError.message)
      return
    }
    setTeams(data ?? [])
  }, [clinic, toast])

  const loadJobs = useCallback(async () => {
    if (!clinicReady) {
      setJobs([])
      return
    }
    setLoading(true)
    const { data, error: queryError } = await supabase
      .from('schedule_jobs')
      .select(
        'id, clinic_id, target_date, team_id, status, created_at, result_snapshot, clinics(name), teams(name)',
      )
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(100)
    setLoading(false)
    if (queryError) {
      toast.error(queryError.message)
      setJobs([])
      return
    }
    const mapped: JobRow[] = ((data ?? []) as JobQueryRow[]).map((row) => ({
      id: row.id,
      clinic_id: row.clinic_id,
      clinicName: relationName(row.clinics) ?? '（名称不明）',
      target_date: row.target_date,
      team_id: row.team_id,
      teamName: relationName(row.teams),
      status: row.status,
      created_at: row.created_at,
      result_snapshot: row.result_snapshot,
    }))
    setJobs(mapped)
  }, [clinicReady, toast])

  const loadItems = useCallback(
    async (jobId: string) => {
      const { data, error: queryError } = await supabase
        .from('schedule_job_items')
        .select(
          'id, job_id, patient_id, team_id, sequence_no, proposed_date, proposed_start, proposed_end, status, reason, adopted_visit_id, patients(name_kanji, area_label)',
        )
        .eq('job_id', jobId)
        .is('deleted_at', null)
        .order('sequence_no', { ascending: true })
      if (queryError) {
        toast.error(queryError.message)
        setItems([])
        return
      }
      setItems((data ?? []) as JobItem[])
    },
    [toast],
  )

  useEffect(() => {
    if (view !== 'proposals') return
    void loadTeams()
    void loadJobs()
  }, [loadTeams, loadJobs, view])

  const clinicOptions = useMemo(() => {
    const byId = new Map<string, string>()
    for (const row of clinics) {
      byId.set(row.id, row.name)
    }
    for (const job of jobs) {
      if (!byId.has(job.clinic_id)) byId.set(job.clinic_id, job.clinicName)
    }
    return buildRecentJobsClinicFilterOptions(
      [...byId.entries()].map(([id, name]) => ({ id, name })),
    )
  }, [clinics, jobs])

  const filteredJobs = useMemo(
    () => filterRecentJobsByClinic(jobs, clinicFilter),
    [jobs, clinicFilter],
  )

  useEffect(() => {
    if (view !== 'proposals') return
    if (filteredJobs.length === 0) return
    if (selectedJobId && filteredJobs.some((job) => job.id === selectedJobId)) {
      return
    }
    setSelectedJobId(filteredJobs[0].id)
  }, [filteredJobs, selectedJobId, view])

  useEffect(() => {
    if (view !== 'proposals') return
    if (!selectedJobId) {
      setItems([])
      return
    }
    void loadItems(selectedJobId)
  }, [selectedJobId, loadItems, view])

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? null,
    [jobs, selectedJobId],
  )

  const activeStep = useMemo(() => {
    if (busy) return 2
    if (items.length > 0) {
      const allClosed = items.every((item) => item.status !== 'proposed')
      if (allClosed) return 4
      return 3
    }
    return 1
  }, [busy, items])

  async function runGenerate(
    date: string,
    selectedTeamId: string | null,
    clinicId: string,
  ) {
    if (!user || !canPropose || !clinicId) return
    setBusy(true)
    try {
      const result = await generateDay0Job({
        clinicId,
        userId: user.id,
        targetDate: date,
        teamId: selectedTeamId,
      })
      const used = getProposalLanePreset(result.lane)
      toast.success(`提案を生成しました（${result.slotCount}件 / ${used.label}）`)
      setSelectedJobId(result.jobId)
      setSection('items')
      await loadJobs()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '生成に失敗しました')
    } finally {
      setBusy(false)
    }
  }

  async function handleAdopt(item: JobItem) {
    const clinicId = selectedJob?.clinic_id ?? clinic?.id
    if (!clinicId || !user || !canPropose || item.status !== 'proposed') return
    setBusy(true)
    try {
      await adoptJobItem({ clinicId, userId: user.id, item })
      toast.success('採用して仮予約を作成しました')
      if (selectedJobId) await loadItems(selectedJobId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '採用に失敗しました')
    } finally {
      setBusy(false)
    }
  }

  async function handleReject(item: JobItem) {
    if (!user || !canPropose || item.status !== 'proposed') return
    setBusy(true)
    try {
      await rejectJobItem({ userId: user.id, itemId: item.id })
      toast.success('提案を却下しました')
      if (selectedJobId) await loadItems(selectedJobId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '却下に失敗しました')
    } finally {
      setBusy(false)
    }
  }

  function handleRerun(job: JobRow) {
    setTargetDate(job.target_date)
    setTeamId(job.team_id ?? '')
    setSection('conditions')
    void runGenerate(job.target_date, job.team_id, job.clinic_id)
  }

  const viewSelect = (
    <div className="w-[11rem]">
      <Select
        id="platform-ai-view"
        label="画面"
        labelTone="muted"
        size="sm"
        options={[...VIEW_OPTIONS]}
        value={view}
        onChange={(event) => setView(event.target.value as PlatformAiView)}
      />
    </div>
  )

  const sectionSelect =
    view === 'proposals' ? (
      <div className="w-[11rem]">
        <Select
          id="proposals-section"
          label="表示"
          labelTone="muted"
          size="sm"
          options={[...SECTION_OPTIONS]}
          value={section}
          onChange={(event) => setSection(event.target.value as ProposalSection)}
        />
      </div>
    ) : null

  const headerActions = (
    <div className="flex flex-wrap items-end justify-end gap-3">
      {view === 'usage' ? usage.filters : null}
      {sectionSelect}
      {viewSelect}
    </div>
  )

  const pageTitle = view === 'usage' ? 'AI利用状況' : '自動提案'

  if (!clinicReady) {
    return (
      <DashboardLayout title={pageTitle} fillViewport actions={headerActions}>
        <ClinicAccessPlaceholder />
      </DashboardLayout>
    )
  }

  if (view === 'usage') {
    return (
      <DashboardLayout title={pageTitle} fillViewport actions={headerActions}>
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
          {!usage.clinicReady ? (
            <p className="text-sm text-slate-500">権限を確認しています…</p>
          ) : (
            <AiUsageJobsTable rows={usage.filteredRows} loading={usage.loading} />
          )}
        </div>
      </DashboardLayout>
    )
  }

  if (!clinic) {
    return (
      <DashboardLayout title={pageTitle} fillViewport actions={headerActions}>
        <p className="text-sm text-slate-500">
          クリニックを選択または作成してください。
        </p>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title={pageTitle} fillViewport actions={headerActions}>
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        {section === 'conditions' ? (
          <GenerateProposalSection
            targetDate={targetDate}
            teamId={teamId}
            teams={teams}
            canPropose={canPropose}
            busy={busy}
            activeStep={activeStep}
            onTargetDateChange={setTargetDate}
            onTeamIdChange={setTeamId}
            onGenerate={() => void runGenerate(targetDate, teamId || null, clinic.id)}
          />
        ) : null}

        {section === 'jobs' ? (
          <RecentJobsSection
            jobs={filteredJobs}
            loading={loading}
            selectedJobId={selectedJobId}
            canPropose={canPropose}
            busy={busy}
            clinicFilter={clinicFilter}
            clinicOptions={clinicOptions}
            onClinicFilterChange={setClinicFilter}
            onSelectJob={setSelectedJobId}
            onRerun={handleRerun}
            onOpenItems={(jobId) => {
              setSelectedJobId(jobId)
              setSection('items')
            }}
          />
        ) : null}

        {section === 'items' ? (
          <ProposalItemsSection
            items={items}
            canPropose={canPropose}
            busy={busy}
            onAdopt={(item) => void handleAdopt(item)}
            onReject={(item) => void handleReject(item)}
          />
        ) : null}
      </div>
    </DashboardLayout>
  )
}
