import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useToast } from '@/components/ui/Toast'
import { usdToYen } from '@/config/aiModelPricing'
import { useClinic } from '@/features/clinic/useClinic'
import { supabase } from '@/lib/supabase'
import { todayISO } from '@/utils/dates'
import { AiUsageFilters } from '../sections/AiUsageFilters'
import type { AiUsageJobRow } from '../sections/AiUsageJobsTable'
import type { UsageTotals } from '../sections/AiUsageTotals'
import { readJobUsage } from '../utils/readJobUsage'

type JobQueryRow = {
  id: string
  clinic_id: string
  target_date: string
  model: string | null
  created_at: string
  result_snapshot: unknown
  clinics: { name: string } | { name: string }[] | null
}

const ALL_CLINICS = ''

function clinicNameOf(row: JobQueryRow): string {
  const clinic = row.clinics
  if (Array.isArray(clinic)) return clinic[0]?.name ?? '（名称不明）'
  return clinic?.name ?? '（名称不明）'
}

function daysAgoISO(days: number): string {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() - days)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function createdDateISO(createdAt: string): string {
  return createdAt.slice(0, 10)
}

/** AI利用状況の取得・絞り込み・フィルタUI（提案ハブと共有） */
export function useAiUsageDashboard(): {
  clinicReady: boolean
  loading: boolean
  filteredRows: AiUsageJobRow[]
  filters: ReactNode
} {
  const { clinicReady } = useClinic()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<AiUsageJobRow[]>([])
  const [clinicId, setClinicId] = useState(ALL_CLINICS)
  const [fromDate, setFromDate] = useState(() => daysAgoISO(30))
  const [toDate, setToDate] = useState(() => todayISO())

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('schedule_jobs')
      .select(
        'id, clinic_id, target_date, model, created_at, result_snapshot, clinics(name)',
      )
      .order('created_at', { ascending: false })
      .limit(500)
    setLoading(false)

    if (error) {
      toast.error(error.message)
      setRows([])
      return
    }

    const mapped: AiUsageJobRow[] = ((data ?? []) as JobQueryRow[]).map(
      (row) => ({
        id: row.id,
        clinicId: row.clinic_id,
        clinicName: clinicNameOf(row),
        targetDate: row.target_date,
        model: row.model ?? '—',
        createdAt: row.created_at,
        usage: readJobUsage(row.result_snapshot, row.model),
      }),
    )
    setRows(mapped)
  }, [toast])

  useEffect(() => {
    if (!clinicReady) return
    void load()
  }, [clinicReady, load])

  const clinicOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const row of rows) {
      if (!map.has(row.clinicId)) map.set(row.clinicId, row.clinicName)
    }
    const options = [...map.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], 'ja'))
      .map(([value, label]) => ({ value, label }))
    return [{ value: ALL_CLINICS, label: 'すべてのクリニック' }, ...options]
  }, [rows])

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (clinicId && row.clinicId !== clinicId) return false
      const day = createdDateISO(row.createdAt)
      if (fromDate && day < fromDate) return false
      if (toDate && day > toDate) return false
      return true
    })
  }, [rows, clinicId, fromDate, toDate])

  const totals = useMemo((): UsageTotals => {
    let totalYen = 0
    for (const row of filteredRows) {
      if (row.usage.costSettled && row.usage.chargedCents !== null) {
        totalYen += usdToYen(row.usage.chargedCents / 100)
      } else if (row.usage.estimateYen !== null) {
        totalYen += row.usage.estimateYen
      } else if (row.usage.chargedCents !== null) {
        totalYen += usdToYen(row.usage.chargedCents / 100)
      }
    }

    const clinicLabel =
      clinicOptions.find((option) => option.value === clinicId)?.label ??
      'すべてのクリニック'
    const periodLabel =
      fromDate || toDate
        ? `${fromDate || '（開始なし）'} 〜 ${toDate || '（終了なし）'}`
        : '全期間'

    return {
      totalYen,
      clinicLabel,
      periodLabel,
    }
  }, [filteredRows, clinicId, clinicOptions, fromDate, toDate])

  const filters = (
    <AiUsageFilters
      clinicOptions={clinicOptions}
      clinicId={clinicId}
      onClinicChange={setClinicId}
      fromDate={fromDate}
      toDate={toDate}
      onFromDateChange={setFromDate}
      onToDateChange={setToDate}
      totals={totals}
    />
  )

  return { clinicReady, loading, filteredRows, filters }
}
