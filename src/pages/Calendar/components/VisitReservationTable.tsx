import { Button } from '@/components/ui/Button'
import {
  canCancelReservation,
  formatReservationDateTime,
  type PatientVisitReservation,
} from '@/pages/Calendar/utils/visitReservationRows'
import { visitStatusLabel } from '@/utils/roleLabels'

type Props = {
  rows: PatientVisitReservation[]
  loading: boolean
  currentVisitId: string
  busy: boolean
  onCancel: (visitId: string) => void
}

export function VisitReservationTable({
  rows,
  loading,
  currentVisitId,
  busy,
  onCancel,
}: Props) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-100">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs font-bold text-slate-500">
          <tr>
            <th className="px-3 py-2.5">状態</th>
            <th className="px-3 py-2.5">予約日時</th>
            <th className="px-3 py-2.5">担当</th>
            <th className="px-3 py-2.5">メニュー</th>
            <th className="px-3 py-2.5">操作</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={5} className="px-3 py-6 text-center text-xs font-medium text-slate-400">
                予約を読み込んでいます
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-3 py-6 text-center text-xs font-medium text-slate-400">
                表示できる予約がありません
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const current = row.id === currentVisitId
              return (
                <tr
                  key={row.id}
                  className={[
                    'border-t border-slate-100',
                    current ? 'bg-amber-50' : 'bg-white',
                  ].join(' ')}
                >
                  <td className="px-3 py-2.5 align-top">
                    <span className="text-xs font-bold text-slate-700">
                      {visitStatusLabel(row.status)}
                    </span>
                    {current ? (
                      <p className="mt-0.5 text-[11px] font-bold text-amber-800">いま開いている予約</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 align-top font-medium text-slate-800">
                    {formatReservationDateTime(
                      row.scheduled_date,
                      row.start_time,
                      row.end_time,
                    )}
                  </td>
                  <td className="px-3 py-2.5 align-top text-slate-700">{row.staffName}</td>
                  <td className="px-3 py-2.5 align-top text-slate-700">{row.menuText}</td>
                  <td className="px-3 py-2.5 align-top">
                    {canCancelReservation(row.status) ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="!px-2.5 !py-1 !text-xs text-rose-600"
                        disabled={busy}
                        onClick={() => onCancel(row.id)}
                      >
                        キャンセル
                      </Button>
                    ) : (
                      <span className="text-xs font-medium text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
