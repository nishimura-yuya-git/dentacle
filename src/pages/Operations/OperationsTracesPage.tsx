import { useCallback, useEffect, useMemo, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { ClinicAccessPlaceholder } from '@/features/clinic/ClinicAccessPlaceholder'
import { useClinic } from '@/features/clinic/useClinic'
import { supabase } from '@/lib/supabase'
import {
  buildOperationClinicFilterOptions,
  DEFAULT_OPERATION_PAGE_SIZE,
  filterOperationTraces,
  OPERATION_ACTION_FILTER_OPTIONS,
  OPERATION_ENTITY_FILTER_OPTIONS,
  paginateOperationTraces,
} from '@/pages/Operations/formatOperationTrace'
import { OperationsTracesPagination } from '@/pages/Operations/OperationsTracesPagination'
import {
  OperationsTracesTable,
  type OperationsTraceRow,
} from '@/pages/Operations/OperationsTracesTable'

type TraceQueryRow = {
  id: string
  clinic_id: string
  action: string
  entity_type: string
  entity_id: string | null
  created_at: string
  payload: Record<string, unknown> | null
  clinics: { name: string } | { name: string }[] | null
}

function clinicNameOf(row: TraceQueryRow): string {
  const clinic = row.clinics
  if (Array.isArray(clinic)) return clinic[0]?.name ?? '（名称不明）'
  return clinic?.name ?? '（名称不明）'
}

export function OperationsTracesPage() {
  const { clinic, clinics, clinicReady, canSwitchClinics } = useClinic()
  const toast = useToast()
  const [rows, setRows] = useState<OperationsTraceRow[]>([])
  const [loading, setLoading] = useState(false)
  const [clinicFilter, setClinicFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_OPERATION_PAGE_SIZE)

  const clinicOptions = useMemo(
    () => buildOperationClinicFilterOptions(clinics),
    [clinics],
  )

  const showClinicFilter = canSwitchClinics || clinics.length > 1

  const load = useCallback(async () => {
    if (!clinicReady) {
      setRows([])
      return
    }
    setLoading(true)
    // RLS が見える範囲を取得。クリニック絞り込みはクライアント側（AI利用状況と同型）
    const { data, error: queryError } = await supabase
      .from('operation_traces')
      .select(
        'id, clinic_id, action, entity_type, entity_id, created_at, payload, clinics(name)',
      )
      .order('created_at', { ascending: false })
      .limit(100)
    setLoading(false)
    if (queryError) {
      toast.error(queryError.message)
      setRows([])
      return
    }
    const mapped: OperationsTraceRow[] = ((data ?? []) as TraceQueryRow[]).map(
      (row) => ({
        id: row.id,
        clinic_id: row.clinic_id,
        clinic_name: clinicNameOf(row),
        action: row.action,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        created_at: row.created_at,
        payload: row.payload,
      }),
    )
    setRows(mapped)
  }, [clinicReady, toast])

  useEffect(() => {
    void load()
  }, [load])

  // ヘッダーのクリニック切替に合わせる（運営は Select で「すべて」にも変更可）
  useEffect(() => {
    if (!clinicReady) return
    if (!showClinicFilter) {
      setClinicFilter(clinic?.id ?? '')
      return
    }
    if (clinic?.id) setClinicFilter(clinic.id)
  }, [clinicReady, clinic?.id, showClinicFilter])

  const filtered = useMemo(
    () =>
      filterOperationTraces(rows, {
        clinicId: clinicFilter,
        action: actionFilter,
        entityType: entityFilter,
      }),
    [rows, clinicFilter, actionFilter, entityFilter],
  )

  const paged = useMemo(
    () => paginateOperationTraces(filtered, page, pageSize),
    [filtered, page, pageSize],
  )

  useEffect(() => {
    if (page !== paged.page) setPage(paged.page)
  }, [page, paged.page])

  if (!clinicReady) {
    return (
      <DashboardLayout title="操作ログ">
        <ClinicAccessPlaceholder />
      </DashboardLayout>
    )
  }

  if (!clinic && clinics.length === 0) {
    return (
      <DashboardLayout title="操作ログ">
        <p className="text-sm text-slate-500">クリニックを選択または作成してください。</p>
      </DashboardLayout>
    )
  }

  const hasFilter = Boolean(clinicFilter || actionFilter || entityFilter)
  const showClinicColumn = showClinicFilter && clinicFilter === ''

  return (
    <DashboardLayout
      title="操作ログ"
      description="カレンダー・電話確認まわりの直近操作を確認します"
      fillViewport
      actions={
        <div className="flex shrink-0 flex-nowrap items-center gap-2 overflow-x-auto">
          {showClinicFilter ? (
            <div className="w-[12rem]">
              <Select
                id="operations-clinic-filter"
                label="クリニック"
                labelTone="muted"
                size="sm"
                options={clinicOptions}
                value={clinicFilter}
                onChange={(event) => {
                  setClinicFilter(event.target.value)
                  setPage(1)
                }}
              />
            </div>
          ) : null}
          <div className="w-[11rem]">
            <Select
              id="operations-action-filter"
              label="操作"
              labelTone="muted"
              size="sm"
              options={OPERATION_ACTION_FILTER_OPTIONS}
              value={actionFilter}
              onChange={(event) => {
                setActionFilter(event.target.value)
                setPage(1)
              }}
            />
          </div>
          <div className="w-[8.5rem]">
            <Select
              id="operations-entity-filter"
              label="対象"
              labelTone="muted"
              size="sm"
              options={OPERATION_ENTITY_FILTER_OPTIONS}
              value={entityFilter}
              onChange={(event) => {
                setEntityFilter(event.target.value)
                setPage(1)
              }}
            />
          </div>
        </div>
      }
    >
      <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-4 flex shrink-0 items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">直近の操作</h2>
            <p className="mt-1 text-xs font-medium text-slate-400">
              新しい順に最大100件まで表示します
            </p>
          </div>
          {!loading ? (
            <p className="shrink-0 text-xs font-bold text-slate-500">
              {hasFilter
                ? `${filtered.length}件 / 取得 ${rows.length}件`
                : `${rows.length}件`}
            </p>
          ) : null}
        </div>
        <OperationsTracesTable
          rows={paged.pageRows}
          loading={loading}
          showClinicColumn={showClinicColumn}
          emptyMessage={
            rows.length === 0
              ? '操作ログはまだありません。カレンダーで仮予約を作成するとここに記録されます。'
              : '条件に一致する操作はありません。絞り込みを変更してください。'
          }
        />
        {!loading ? (
          <OperationsTracesPagination
            page={paged.page}
            totalPages={paged.totalPages}
            pageSize={paged.pageSize}
            totalCount={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next)
              setPage(1)
            }}
          />
        ) : null}
      </section>
    </DashboardLayout>
  )
}
