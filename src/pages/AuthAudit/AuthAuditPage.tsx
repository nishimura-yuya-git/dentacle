import { useCallback, useEffect, useMemo, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import {
  blockAuthIp,
  unblockAuthIp,
} from '@/features/auth/recordAuthAudit'
import { supabase } from '@/lib/supabase'
import {
  formatAuthAuditMembershipsLabel,
  parseAuthAuditMemberships,
} from '@/pages/AuthAudit/authAuditMemberships'
import { AuthAuditJapanMap } from '@/pages/AuthAudit/AuthAuditJapanMap'
import { AuthAuditTable, type AuthAuditRow } from '@/pages/AuthAudit/AuthAuditTable'
import { AuthPresencePanel } from '@/pages/AuthAudit/AuthPresencePanel'
import { formatAuthAuditEventLabel } from '@/pages/AuthAudit/formatAuthAudit'
import { formatAuthIpBlockConfirmMessage } from '@/pages/AuthAudit/formatAuthIpBlock'
import { lookupIpGeoMap } from '@/pages/AuthAudit/lookupIpRegion'
import {
  clusterAuthAuditMapPins,
  resolveAuthAuditMapPin,
} from '@/pages/AuthAudit/resolveAuthAuditMapPin'
import {
  DEFAULT_OPERATION_PAGE_SIZE,
  paginateOperationTraces,
} from '@/pages/Operations/formatOperationTrace'
import { OperationsTracesPagination } from '@/pages/Operations/OperationsTracesPagination'

type LogRow = {
  id: string
  user_id: string | null
  clinic_id: string | null
  event: string
  ip: string | null
  user_agent: string | null
  created_at: string
  metadata: unknown
  clinics: { name: string | null } | null
}

type AuthAuditView = 'map' | 'table' | 'presence'

const VIEW_OPTIONS: { value: AuthAuditView; label: string }[] = [
  { value: 'map', label: '推定ログイン位置' },
  { value: 'table', label: '認証イベント一覧' },
  { value: 'presence', label: '現在ログイン中' },
]

const EVENT_FILTER_OPTIONS = [
  { value: '', label: 'すべてのイベント' },
  { value: 'login_success', label: 'ログイン成功' },
  { value: 'logout', label: 'ログアウト' },
  { value: 'login_failure', label: 'ログイン失敗' },
]

/** 運営専用: auth_audit_logs の閲覧 */
export function AuthAuditPage() {
  const toast = useToast()
  const [rows, setRows] = useState<AuthAuditRow[]>([])
  const [loading, setLoading] = useState(true)
  const [geoLoading, setGeoLoading] = useState(false)
  const [view, setView] = useState<AuthAuditView>('map')
  const [eventFilter, setEventFilter] = useState('')
  const [mapFilter, setMapFilter] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_OPERATION_PAGE_SIZE)
  const [blockedIps, setBlockedIps] = useState<Set<string>>(new Set())
  const [blockingIp, setBlockingIp] = useState<string | null>(null)

  const loadBlockedIps = useCallback(async () => {
    const { data, error } = await supabase
      .from('auth_ip_blocks')
      .select('ip')
      .eq('is_active', true)
    if (error) {
      console.error('[auth_ip_blocks]', error.message)
      return
    }
    setBlockedIps(new Set((data ?? []).map((row) => row.ip.trim()).filter(Boolean)))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setGeoLoading(true)
    const [{ data, error }, _] = await Promise.all([
      supabase
        .from('auth_audit_logs')
        .select('id, user_id, clinic_id, event, ip, user_agent, created_at, metadata, clinics(name)')
        .order('created_at', { ascending: false })
        .limit(200),
      loadBlockedIps(),
    ])

    if (error) {
      toast.error(error.message)
      setRows([])
      setLoading(false)
      setGeoLoading(false)
      return
    }

    const logs = (data ?? []) as unknown as LogRow[]
    const userIds = [...new Set(logs.map((row) => row.user_id).filter(Boolean))] as string[]
    const labelByUser = new Map<string, string>()

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, display_name')
        .in('id', userIds)
      for (const profile of profiles ?? []) {
        const name = profile.display_name?.trim()
        const email = profile.email?.trim()
        labelByUser.set(profile.id, name || email || profile.id.slice(0, 8))
      }
    }

    const baseRows: AuthAuditRow[] = logs.map((row) => {
      const memberships = parseAuthAuditMemberships(row.metadata)
      const clinicName = row.clinics?.name?.trim()
      return {
        id: row.id,
        user_id: row.user_id,
        user_label: row.user_id
          ? (labelByUser.get(row.user_id) ?? `${row.user_id.slice(0, 8)}…`)
          : '（不明）',
        event: row.event,
        ip: row.ip,
        region_label: '',
        pin_key: 'unknown',
        is_anomaly: false,
        clinic_label: clinicName || '（未特定）',
        memberships_label: formatAuthAuditMembershipsLabel(memberships),
        ip_blocked: false,
        user_agent: row.user_agent,
        created_at: row.created_at,
      }
    })
    setRows(baseRows)
    setLoading(false)

    const geoByIp = await lookupIpGeoMap(baseRows.map((row) => row.ip))
    setRows((current) =>
      current.map((row) => {
        const ip = row.ip?.trim()
        const geo = ip ? geoByIp.get(ip) : undefined
        const pin = resolveAuthAuditMapPin(geo)
        return {
          ...row,
          region_label: geo?.label ?? '—',
          pin_key: pin.key,
          is_anomaly: pin.isAnomaly,
        }
      }),
    )
    setGeoLoading(false)
  }, [toast, loadBlockedIps])

  useEffect(() => {
    void load()
  }, [load])

  // ブロック状態を行へ反映
  useEffect(() => {
    setRows((current) =>
      current.map((row) => ({
        ...row,
        ip_blocked: Boolean(row.ip?.trim() && blockedIps.has(row.ip.trim())),
      })),
    )
  }, [blockedIps])

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (eventFilter && row.event !== eventFilter) return false
      if (mapFilter && row.pin_key !== mapFilter) return false
      return true
    })
  }, [rows, eventFilter, mapFilter])

  const mapClusters = useMemo(() => {
    const eventScoped = eventFilter
      ? rows.filter((row) => row.event === eventFilter)
      : rows
    return clusterAuthAuditMapPins(eventScoped)
  }, [rows, eventFilter])

  const paged = useMemo(
    () => paginateOperationTraces(filtered, page, pageSize),
    [filtered, page, pageSize],
  )

  useEffect(() => {
    setPage(1)
  }, [eventFilter, mapFilter, pageSize])

  useEffect(() => {
    if (page !== paged.page) setPage(paged.page)
  }, [page, paged.page])

  const handleMapSelect = useCallback((key: string | null) => {
    setMapFilter(key)
    if (key) setView('table')
  }, [])

  const handleBlockIp = useCallback(
    async (ip: string) => {
      const ok = window.confirm(formatAuthIpBlockConfirmMessage(ip))
      if (!ok) return
      setBlockingIp(ip)
      const result = await blockAuthIp(ip, 'ログイン監査から手動ブロック')
      setBlockingIp(null)
      if (!result.ok) {
        toast.error(result.errorMessage ?? 'ブロックに失敗しました')
        return
      }
      toast.success('IPをブロックしました')
      await loadBlockedIps()
    },
    [toast, loadBlockedIps],
  )

  const handleUnblockIp = useCallback(
    async (ip: string) => {
      const ok = window.confirm(`IP ${ip} のブロックを解除しますか？`)
      if (!ok) return
      setBlockingIp(ip)
      const result = await unblockAuthIp(ip)
      setBlockingIp(null)
      if (!result.ok) {
        toast.error(result.errorMessage ?? '解除に失敗しました')
        return
      }
      toast.success('ブロックを解除しました')
      await loadBlockedIps()
    },
    [toast, loadBlockedIps],
  )

  const hasFilter = Boolean(eventFilter || mapFilter)
  const description =
    view === 'map'
      ? '都道府県を選ぶと認証イベント一覧に切り替わります'
      : view === 'presence'
        ? '画面を開いているユーザーを20秒ごとに更新します'
        : 'IPは回線の出口です。ブロック前に同じ回線の別端末でIPが一致するか確認してください'

  return (
    <DashboardLayout
      title="ログイン監査"
      description={description}
      fillViewport
      actions={
        <div className="flex flex-wrap items-end justify-end gap-3">
          {view === 'table' ? (
            <div className="w-[12rem] shrink-0">
              <Select
                id="auth-audit-event-filter"
                label="イベント"
                labelTone="muted"
                size="sm"
                options={EVENT_FILTER_OPTIONS}
                value={eventFilter}
                onChange={(event) => {
                  setEventFilter(event.target.value)
                  setPage(1)
                }}
              />
            </div>
          ) : null}
          <div className="w-[13.5rem] shrink-0">
            <Select
              id="auth-audit-view"
              label="画面"
              labelTone="muted"
              size="sm"
              options={VIEW_OPTIONS}
              value={view}
              onChange={(event) => setView(event.target.value as AuthAuditView)}
            />
          </div>
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className={view === 'map' ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}>
          <AuthAuditJapanMap
            clusters={mapClusters}
            selectedKey={mapFilter}
            onSelect={handleMapSelect}
            loading={loading || geoLoading}
          />
        </div>

        <div className={view === 'presence' ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}>
          <AuthPresencePanel active={view === 'presence'} />
        </div>

        <section
          id="auth-audit-table"
          className={
            view === 'table'
              ? 'flex min-h-0 flex-1 flex-col rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm md:p-5'
              : 'hidden'
          }
        >
          <div className="mb-3 flex shrink-0 flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900">直近の認証イベント</h2>
              <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                所属はログイン時点のスナップショット。IPは端末単体ではなく回線共有のことがあります
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {!loading ? (
                <p className="text-xs font-bold text-slate-500">
                  {hasFilter
                    ? `${filtered.length}件 / 取得 ${rows.length}件${
                        eventFilter ? `・${formatAuthAuditEventLabel(eventFilter)}` : ''
                      }${mapFilter ? '・地図絞り込み中' : ''}`
                    : `${rows.length}件`}
                </p>
              ) : null}
              {mapFilter ? (
                <button
                  type="button"
                  onClick={() => setMapFilter(null)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  地図の絞り込み解除
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setView('map')}
                className="rounded-full bg-[#008C01] px-3 py-1 text-[11px] font-bold text-white transition hover:bg-[#006b01]"
              >
                地図に戻る
              </button>
            </div>
          </div>
          <AuthAuditTable
            rows={paged.pageRows}
            loading={loading}
            onBlockIp={(ip) => {
              void handleBlockIp(ip)
            }}
            onUnblockIp={(ip) => {
              void handleUnblockIp(ip)
            }}
            blockingIp={blockingIp}
          />
          {!loading ? (
            <div className="shrink-0">
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
            </div>
          ) : null}
        </section>
      </div>
    </DashboardLayout>
  )
}
