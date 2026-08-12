import {
  formatOperationActionLabel,
  formatOperationCreatedAt,
  formatOperationDetail,
  formatOperationEntityLabel,
} from '@/pages/Operations/formatOperationTrace'

export type OperationsTraceRow = {
  id: string
  clinic_id: string
  clinic_name: string
  action: string
  entity_type: string
  entity_id: string | null
  created_at: string
  payload: Record<string, unknown> | null
}

type Props = {
  rows: OperationsTraceRow[]
  loading: boolean
  /** 複数院表示時にクリニック列を出す */
  showClinicColumn?: boolean
  emptyMessage?: string
}

const TH =
  'sticky top-0 z-10 whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-xs font-bold text-slate-600'

const TD = 'border-b border-slate-100 px-3 py-3 align-middle text-sm text-slate-700'

/** 操作ログ一覧表（縦スクロール・見出し固定） */
export function OperationsTracesTable({
  rows,
  loading,
  showClinicColumn = false,
  emptyMessage = '操作ログはまだありません。カレンダーで仮予約を作成するとここに記録されます。',
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
        <p className="text-center text-sm text-slate-400">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-slate-200 bg-white">
      <table className="min-w-[720px] w-full border-collapse">
        <thead>
          <tr>
            <th className={TH}>操作日時</th>
            {showClinicColumn ? <th className={TH}>クリニック</th> : null}
            <th className={TH}>操作</th>
            <th className={TH}>対象</th>
            <th className={TH}>詳細</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const rowBg = index % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'
            const known = formatOperationActionLabel(row.action) !== 'その他の操作'
            return (
              <tr key={row.id} className={`${rowBg} hover:bg-emerald-50/40`}>
                <td className={`${TD} whitespace-nowrap text-slate-600`}>
                  {formatOperationCreatedAt(row.created_at)}
                </td>
                {showClinicColumn ? (
                  <td className={`${TD} max-w-[12rem] truncate font-medium text-slate-800`}>
                    {row.clinic_name}
                  </td>
                ) : null}
                <td className={TD}>
                  <p className="font-bold text-slate-900">
                    {formatOperationActionLabel(row.action)}
                  </p>
                  {!known ? (
                    <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                      {row.action}
                    </p>
                  ) : null}
                </td>
                <td className={`${TD} whitespace-nowrap`}>
                  {formatOperationEntityLabel(row.entity_type)}
                </td>
                <td className={`${TD} text-slate-600`}>
                  {formatOperationDetail({
                    action: row.action,
                    entity_id: row.entity_id,
                    payload: row.payload,
                  })}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
