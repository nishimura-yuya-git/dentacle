import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/features/auth/useAuth'
import { ClinicAccessPlaceholder } from '@/features/clinic/ClinicAccessPlaceholder'
import { useClinic } from '@/features/clinic/useClinic'
import { supabase } from '@/lib/supabase'
import { todayISO } from '@/utils/dates'
import { getProposalLanePreset } from '@/utils/schedule/proposalLanePresets'
import { useAiUsageDashboard } from '@/pages/Admin/hooks/useAiUsageDashboard'
import { AiUsageJobsTable } from '@/pages/Admin/sections/AiUsageJobsTable'
import { generateDay0Job } from './hooks/proposalActions'
import {
  viewFromSearch,
  type PlatformAiView,
  type ProposalSection,
  type ProposalsHubItem,
} from './proposalsHub'
import { GenerateProposalSection } from './sections/GenerateProposalSection'
import { ProposalsArticle } from './sections/ProposalsArticle'
import { ProposalsHubNav } from './sections/ProposalsHubNav'
import { RecentJobsSection } from './sections/RecentJobsSection'
import type { JobRow, Team } from './types'
import {
  buildRecentJobsClinicFilterOptions,
  filterRecentJobsByClinic,
} from './utils/filterRecentJobs'

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

function relationName(
  value: { name: string } | { name: string }[] | null,
): string | null {
  if (!value) return null
  if (Array.isArray(value)) return value[0]?.name ?? null
  return value.name
}

/**
 * 運営向けハブ: 見出し右端のタブで条件・ジョブ・利用状況を切替。
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

  function handleHubSelect(item: ProposalsHubItem) {
    setView(item.view)
    if (item.section) setSection(item.section)
  }

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
      setSection('jobs')
      await loadJobs()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '生成に失敗しました')
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

  const hubActions = (
    <ProposalsHubNav
      view={view}
      section={section}
      onSelect={handleHubSelect}
    />
  )

  const hubFrame = (body: ReactNode) => (
    <DashboardLayout title="自動提案" fillViewport actions={hubActions}>
      <ProposalsArticle>{body}</ProposalsArticle>
    </DashboardLayout>
  )

  if (!clinicReady) {
    return hubFrame(<ClinicAccessPlaceholder />)
  }

  if (view === 'usage') {
    return hubFrame(
      <section>
        <div className="overflow-x-auto">{usage.filters}</div>
        {!usage.clinicReady ? (
          <p className="mt-4 text-sm text-slate-500">権限を確認しています…</p>
        ) : (
          <AiUsageJobsTable
            rows={usage.filteredRows}
            loading={usage.loading}
            embedded
          />
        )}
      </section>,
    )
  }

  if (!clinic) {
    return hubFrame(
      <p className="text-sm text-slate-500">
        クリニックを選択または作成してください。
      </p>,
    )
  }

  return hubFrame(
    <>
      {section === 'conditions' ? (
        <GenerateProposalSection
          targetDate={targetDate}
          teamId={teamId}
          teams={teams}
          canPropose={canPropose}
          busy={busy}
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
          onRerun={handleRerun}
        />
      ) : null}
    </>,
  )
}
