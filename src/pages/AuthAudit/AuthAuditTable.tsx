import {
  formatAuthAuditCreatedAt,
  formatAuthAuditDeviceLabel,
  formatAuthAuditEventLabel,
} from '@/pages/AuthAudit/formatAuthAudit'

export type AuthAuditRow = {
  id: string
  user_id: string | null
  user_label: string
  event: string
  ip: string | null
  /** GeoIPの粗い推定。未解決時は空文字 */
  region_label: string
  /** 地図ピン key（都道府県 / overseas / unknown） */
  pin_key: string
  is_anomaly: boolean
  clinic_label: string
  memberships_label: string
  ip_blocked: boolean
  user_agent: string | null
  created_at: string
}

type Props = {
  rows: AuthAuditRow[]
  loading: boolean
  onBlockIp: (ip: string) => void
  onUnblockIp: (ip: string) => void
  blockingIp: string | null
}

const TH =
  'sticky top-0 z-10 whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-bold text-slate-600'

const TD = 'border-b border-slate-100 px-3 py-2 align-middle text-sm text-slate-700'

/** ログイン監査一覧（運営専用） */
export function AuthAuditTable({
  rows,
  loading,
  onBlockIp,
  onUnblockIp,
  blockingIp,
}: Props) {
  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <p className="text-sm text-slate-400">読み込み中…</p>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center px-4">
        <p className="text-center text-sm text-slate-400">
          該当するログイン監査はありません。地図のピンやイベント条件を変えてみてください。
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-slate-200 bg-white">
      <table className="min-w-[1100px] w-full border-collapse">
        <thead>
          <tr>
            <th className={TH}>日時</th>
            <th className={TH}>イベント</th>
            <th className={TH}>ユーザー</th>
            <th className={TH}>選択クリニック</th>
            <th className={TH}>所属クリニック</th>
            <th
              className={TH}
              title="回線の出口（グローバルIP）。同じWi‑Fiの別端末でも一致することがあります"
            >
              IPアドレス
            </th>
            <th className={TH}>推定地域</th>
            <th className={TH}>端末</th>
            <th className={TH}>操作</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const rowBg = row.is_anomaly
              ? 'bg-rose-50/70'
              : index % 2 === 0
                ? 'bg-white'
                : 'bg-slate-50/80'
            const ip = row.ip?.trim() || ''
            const busy = Boolean(ip && blockingIp === ip)
            return (
              <tr key={row.id} className={`${rowBg} hover:bg-emerald-50/40`}>
                <td className={`${TD} whitespace-nowrap text-slate-600`}>
                  {formatAuthAuditCreatedAt(row.created_at)}
                </td>
                <td className={`${TD} whitespace-nowrap font-medium text-slate-800`}>
                  {formatAuthAuditEventLabel(row.event)}
                </td>
                <td className={`${TD} max-w-[12rem] truncate font-medium text-slate-800`}>
                  {row.user_label}
                </td>
                <td className={`${TD} max-w-[10rem] truncate text-slate-700`}>
                  {row.clinic_label}
                </td>
                <td
                  className={`${TD} max-w-[14rem] truncate text-slate-700`}
                  title={row.memberships_label}
                >
                  {row.memberships_label}
                </td>
                <td
                  className={`${TD} whitespace-nowrap font-mono text-[13px] text-slate-700`}
                  title={
                    ip
                      ? '回線の出口IP（端末単体ではありません）。同じ回線の別端末で一致するか確認できます'
                      : undefined
                  }
                >
                  <span className="inline-flex items-center gap-1.5">
                    {ip || '—'}
                    {row.ip_blocked ? (
                      <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-black text-white">
                        ブロック中
                      </span>
                    ) : null}
                  </span>
                </td>
                <td className={`${TD} max-w-[12rem] text-sm text-slate-700`}>
                  <span className="inline-flex max-w-full items-center gap-1.5">
                    {row.is_anomaly ? (
                      <span className="shrink-0 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-black text-white">
                        海外
                      </span>
                    ) : null}
                    <span className="truncate">{row.region_label || '取得中…'}</span>
                  </span>
                </td>
                <td
                  className={`${TD} whitespace-nowrap text-sm text-slate-700`}
                  title={row.user_agent?.trim() || undefined}
                >
                  {formatAuthAuditDeviceLabel(row.user_agent)}
                </td>
                <td className={`${TD} whitespace-nowrap`}>
                  {ip ? (
                    row.ip_blocked ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onUnblockIp(ip)}
                        className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        {busy ? '処理中…' : 'ブロック解除'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onBlockIp(ip)}
                        title="回線の出口IPをブロックします（端末単体ではありません）"
                        className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                      >
                        {busy ? '処理中…' : 'IPをブロック'}
                      </button>
                    )
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
