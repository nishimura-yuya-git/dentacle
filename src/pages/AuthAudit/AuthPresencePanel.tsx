import { useCallback, useEffect, useState } from 'react'
import {
  AUTH_PRESENCE_ONLINE_WITHIN_SECONDS,
  AUTH_PRESENCE_POLL_SECONDS,
  listAuthPresence,
  type AuthPresenceRow,
} from '@/features/auth/authPresence'
import {
  formatAuthAuditCreatedAt,
  formatAuthAuditDeviceLabel,
} from '@/pages/AuthAudit/formatAuthAudit'

const TH =
  'sticky top-0 z-10 whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-bold text-slate-600'
const TD = 'border-b border-slate-100 px-3 py-2 align-middle text-sm text-slate-700'

type Props = {
  active: boolean
}

/** 運営向け: ハートビート在席一覧（20秒更新） */
export function AuthPresencePanel({ active }: Props) {
  const [rows, setRows] = useState<AuthPresenceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null)

  const load = useCallback(async (silent: boolean) => {
    if (!silent) setLoading(true)
    const result = await listAuthPresence(AUTH_PRESENCE_ONLINE_WITHIN_SECONDS)
    if (result.errorMessage) {
      setErrorMessage(result.errorMessage)
      if (!silent) setRows([])
      setLoading(false)
      return
    }
    setErrorMessage(null)
    setRows(result.rows)
    setRefreshedAt(new Date().toISOString())
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!active) return
    void load(false)
    const timer = setInterval(() => {
      void load(true)
    }, AUTH_PRESENCE_POLL_SECONDS * 1000)
    return () => clearInterval(timer)
  }, [active, load])

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm md:p-5">
      <div className="mb-3 flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-slate-900">現在ログイン中</h2>
          <p className="mt-0.5 text-[11px] font-medium text-slate-400">
            直近{AUTH_PRESENCE_ONLINE_WITHIN_SECONDS}
            秒以内に画面を開いているユーザー（{AUTH_PRESENCE_POLL_SECONDS}
            秒ごとに更新）。複数端末は1行にまとめます
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {!loading ? (
            <p className="text-xs font-bold text-slate-500">{rows.length}人</p>
          ) : null}
          {refreshedAt ? (
            <p className="text-[11px] font-medium text-slate-400">
              更新 {formatAuthAuditCreatedAt(refreshedAt)}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => {
              void load(false)
            }}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50"
          >
            再読込
          </button>
        </div>
      </div>

      {errorMessage ? (
        <div
          role="alert"
          className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
        >
          {errorMessage}
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <p className="text-sm text-slate-400">読み込み中…</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center px-4">
          <p className="text-center text-sm text-slate-400">
            いま画面を開いているユーザーはいません。
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-[900px] w-full border-collapse">
            <thead>
              <tr>
                <th className={TH}>状態</th>
                <th className={TH}>ユーザー</th>
                <th className={TH}>選択クリニック</th>
                <th className={TH}>IPアドレス</th>
                <th className={TH}>端末</th>
                <th className={TH}>最終心拍</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const label =
                  row.display_name?.trim() ||
                  row.email?.trim() ||
                  `${row.user_id.slice(0, 8)}…`
                const rowBg = index % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'
                return (
                  <tr key={row.user_id} className={`${rowBg} hover:bg-emerald-50/40`}>
                    <td className={`${TD} whitespace-nowrap`}>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-[#008C01]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#008C01]" aria-hidden />
                        在席
                      </span>
                    </td>
                    <td className={`${TD} max-w-[14rem] truncate font-medium text-slate-800`}>
                      {label}
                    </td>
                    <td className={`${TD} max-w-[12rem] truncate text-slate-700`}>
                      {row.clinic_name?.trim() || '（未特定）'}
                    </td>
                    <td className={`${TD} whitespace-nowrap font-mono text-[13px] text-slate-700`}>
                      {row.ip?.trim() || '—'}
                    </td>
                    <td
                      className={`${TD} whitespace-nowrap text-sm text-slate-700`}
                      title={row.user_agent?.trim() || undefined}
                    >
                      {formatAuthAuditDeviceLabel(row.user_agent)}
                    </td>
                    <td className={`${TD} whitespace-nowrap text-slate-600`}>
                      {formatAuthAuditCreatedAt(row.last_seen_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
