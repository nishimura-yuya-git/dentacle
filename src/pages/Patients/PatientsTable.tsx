import { Link } from 'react-router-dom'
import {
  formatListDate,
  formatNextVisit,
  patientInitial,
} from '@/pages/Patients/formatPatientList'
import type { PatientListRow } from '@/pages/Patients/patientListTypes'

type Props = {
  patients: PatientListRow[]
  selectedIds: Set<string>
  onToggleOne: (id: string) => void
  onToggleAll: () => void
}

const TH =
  'whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-xs font-bold text-slate-600'

const TD = 'border-b border-slate-100 px-3 py-3 align-middle text-sm text-slate-700'

export function PatientsTable({
  patients,
  selectedIds,
  onToggleOne,
  onToggleAll,
}: Props) {
  const allSelected = patients.length > 0 && patients.every((p) => selectedIds.has(p.id))

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="min-w-[1100px] w-full border-collapse">
        <thead>
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
            <th className={`${TH} min-w-[5.5rem] whitespace-nowrap`}>操作</th>
            <th className={TH}>連絡手段</th>
            <th className={TH}>来院</th>
            <th className={TH}>売上累計</th>
            <th className={TH}>初診日</th>
            <th className={TH}>前回</th>
            <th className={TH}>次回</th>
            <th className={TH}>主担当</th>
            <th className={TH}>次回予約内容</th>
            <th className={TH}>技工物</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((patient, index) => {
            const selected = selectedIds.has(patient.id)
            const rowBg = index % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'
            return (
              <tr key={patient.id} className={`${rowBg} hover:bg-emerald-50/40`}>
                <td className={TD}>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onToggleOne(patient.id)}
                    aria-label={`${patient.name_kanji}を選択`}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                </td>
                <td className={TD}>
                  <Link
                    to={`/patients/${patient.id}`}
                    className="flex min-w-[220px] items-start gap-3 hover:opacity-90"
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
                      {patientInitial(patient.name_kanji)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-bold text-slate-900">
                        {patient.name_kanji}
                        {patient.name_kana ? (
                          <span className="ml-2 font-medium text-slate-500">
                            {patient.name_kana}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block truncate text-xs font-medium text-slate-400">
                        {patient.chart_number ? `- - ${patient.chart_number}` : '—'}
                        {patient.phone ? `　${patient.phone}` : ''}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className={`${TD} whitespace-nowrap`}>
                  <Link
                    to={`/patients/${patient.id}`}
                    className="inline-flex whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold text-[#008C01] transition hover:bg-emerald-50"
                  >
                    編集
                  </Link>
                </td>
                <td className={`${TD} text-slate-400`}>—</td>
                <td className={TD}>
                  {patient.visit_count != null ? `${patient.visit_count}回` : '—'}
                </td>
                <td className={`${TD} text-slate-400`}>—</td>
                <td className={`${TD} text-slate-400`}>—</td>
                <td className={TD}>{formatListDate(patient.last_visit_date)}</td>
                <td className={TD}>
                  <span className="inline-flex flex-wrap items-center gap-1">
                    <span>
                      {formatNextVisit(patient.next_visit_date, patient.next_visit_time)}
                    </span>
                    {patient.next_visit_provisional ? (
                      <span className="text-xs font-bold text-rose-500">[仮]</span>
                    ) : null}
                  </span>
                </td>
                <td className={TD}>{patient.primary_doctor_name || '—'}</td>
                <td className={`${TD} text-slate-400`}>—</td>
                <td className={`${TD} text-slate-400`}>—</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
