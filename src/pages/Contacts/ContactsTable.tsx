import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import type { ContactRow, PhoneStatus } from '@/pages/Contacts/contactListTypes'
import {
  INFECTIOUS_DISEASE_LABEL,
  listCellClassName,
  listKanaClassName,
  listMetaClassName,
  listNameClassName,
  listRowClassName,
} from '@/pages/Patients/infectiousDiseasePolicy'
import { formatListDate } from '@/pages/Patients/formatPatientList'
import { PatientIcon } from '@/pages/Patients/PatientIcon'
import { formatTime } from '@/utils/dates'
import { phoneStatusLabel, visitStatusLabel } from '@/utils/roleLabels'

type Props = {
  rows: ContactRow[]
  selectedIds: Set<string>
  busy: boolean
  canWrite: boolean
  actionStatuses: PhoneStatus[]
  onToggleOne: (id: string) => void
  onToggleAll: () => void
  onQuickStatus: (row: ContactRow, status: PhoneStatus) => void
}

const TH =
  'whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-xs font-bold text-slate-600'

const ACTION_STATUSES_SHORT: PhoneStatus[] = [
  'ok',
  'ng',
  'absent',
  'callback_waiting',
  'facility_waiting',
]

function statusBadgeClass(status: string): string {
  if (status === 'pending') {
    return 'border-rose-400 bg-white text-rose-600'
  }
  if (status === 'ok') {
    return 'border-[#008C01] bg-emerald-50 text-[#008C01]'
  }
  if (status === 'ng') {
    return 'border-rose-300 bg-rose-50 text-rose-600'
  }
  if (status === 'absent' || status === 'callback_waiting') {
    return 'border-orange-300 bg-orange-50 text-orange-700'
  }
  if (status === 'facility_waiting') {
    return 'border-indigo-300 bg-indigo-50 text-indigo-700'
  }
  return 'border-slate-200 bg-slate-50 text-slate-500'
}

function reservationLabel(row: ContactRow): string {
  const visit = row.visits
  if (!visit) return '—'
  const statusTag = `[${visitStatusLabel(visit.status)}]`
  const datePart = formatListDate(visit.scheduled_date).replace(/^\d{4}年\s*/, '')
  const timePart = formatTime(visit.start_time)
  return `${statusTag} ${datePart} ${timePart}`
}

export function ContactsTable({
  rows,
  selectedIds,
  busy,
  canWrite,
  actionStatuses = ACTION_STATUSES_SHORT,
  onToggleOne,
  onToggleAll,
  onQuickStatus,
}: Props) {
  const allSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.id))

  return (
    <table className="min-w-[1180px] w-full border-separate border-spacing-0 text-left text-sm">
      <thead className="sticky top-0 z-10 shadow-sm">
        <tr>
            <th className={`${TH} w-10`}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleAll}
                aria-label="すべて選択"
                className="h-4 w-4 rounded border-slate-300"
              />
            </th>
            <th className={TH}>お名前</th>
            <th className={`${TH} min-w-[14rem]`}>操作</th>
            <th className={TH}>電話</th>
            <th className={TH}>訪問日</th>
            <th className={TH}>時間</th>
            <th className={TH}>確認状態</th>
            <th className={TH}>予約内容</th>
            <th className={TH}>メモ</th>
            <th className={TH}>エリア</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const selected = selectedIds.has(row.id)
            const infectious = row.patients?.has_infectious_disease === true
            const td = listCellClassName(infectious)
            const name = row.patients?.name_kanji ?? '患者不明'
            return (
              <tr key={row.id} className={listRowClassName(infectious, index)}>
                <td className={td}>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onToggleOne(row.id)}
                    aria-label={`${name}を選択`}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                </td>
                <td className={td}>
                  <Link
                    to={`/patients/${row.patient_id}`}
                    className="flex min-w-[220px] items-start gap-3"
                  >
                    <span className="mt-0.5 shrink-0">
                      <PatientIcon iconId={row.icon_id} name={name} />
                    </span>
                    <span className="min-w-0">
                      <span className={`block truncate font-bold ${listNameClassName(infectious)}`}>
                        <span className="underline-offset-[3px] decoration-slate-400 group-hover:underline group-hover:decoration-dotted">
                          {name}
                          {row.patients?.name_kana ? (
                            <span className={`ml-2 font-medium ${listKanaClassName(infectious)}`}>
                              {row.patients.name_kana}
                            </span>
                          ) : null}
                          {infectious ? (
                            <span className="ml-2 inline-flex items-center rounded-md bg-slate-950/50 px-1.5 py-0.5 text-[10px] font-bold text-slate-50">
                              {INFECTIOUS_DISEASE_LABEL}
                            </span>
                          ) : null}
                        </span>
                      </span>
                      <span className={`mt-0.5 block truncate text-xs font-medium ${listMetaClassName(infectious)}`}>
                        {row.patients?.chart_number
                          ? `- - ${row.patients.chart_number}`
                          : '—'}
                        {row.patients?.phone ? ` ${row.patients.phone}` : ''}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className={`${td} whitespace-nowrap`}>
                  {canWrite ? (
                    <div className="flex max-w-[18rem] flex-wrap gap-1.5">
                      {actionStatuses.map((status) => (
                        <Button
                          key={status}
                          variant={status === 'ok' ? 'primary' : 'secondary'}
                          className="!rounded-lg !px-2.5 !py-1 !text-[11px]"
                          loading={busy}
                          disabled={row.status === status}
                          onClick={() => onQuickStatus(row, status)}
                        >
                          {phoneStatusLabel(status)}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs font-medium text-slate-400">
                      更新権限なし
                    </span>
                  )}
                </td>
                <td className={`${td} whitespace-nowrap tabular-nums`}>
                  {row.patients?.phone || '未登録'}
                </td>
                <td className={`${td} whitespace-nowrap`}>
                  {formatListDate(row.visits?.scheduled_date)}
                </td>
                <td className={`${td} whitespace-nowrap tabular-nums`}>
                  {formatTime(row.visits?.start_time)}〜{formatTime(row.visits?.end_time)}
                </td>
                <td className={`${td} whitespace-nowrap`}>
                  <span
                    className={`inline-flex items-center whitespace-nowrap rounded-md border px-2 py-1 text-xs font-bold ${statusBadgeClass(row.status)}`}
                  >
                    {phoneStatusLabel(row.status)}
                  </span>
                </td>
                <td className={`${td} min-w-[10rem] text-xs font-medium ${infectious ? 'text-slate-200' : 'text-slate-700'}`}>
                  {reservationLabel(row)}
                </td>
                <td className={`${td} max-w-[12rem] truncate text-xs ${infectious ? 'text-slate-300' : 'text-slate-500'}`}>
                  {row.result_note?.trim() || '—'}
                </td>
                <td className={td}>{row.patients?.area_label || '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
  )
}
