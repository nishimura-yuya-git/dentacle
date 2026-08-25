import { Link } from 'react-router-dom'
import { formatListDate, formatNextVisit } from '@/pages/Patients/formatPatientList'
import {
  INFECTIOUS_DISEASE_LABEL,
  listCellClassName,
  listKanaClassName,
  listMetaClassName,
  listNameClassName,
  listRowClassName,
} from '@/pages/Patients/infectiousDiseasePolicy'
import { PatientIcon } from '@/pages/Patients/PatientIcon'
import type { PatientListRow } from '@/pages/Patients/patientListTypes'

type Props = {
  patients: PatientListRow[]
}

const TH =
  'whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-xs font-bold text-slate-600'

/** お名前 / 来院 / 前回 / 次回 / 主担当。空列とチェックは置かない。 */
export function PatientsTable({ patients }: Props) {
  return (
    <table className="min-w-[720px] w-full border-separate border-spacing-0 text-left text-sm">
      <thead className="sticky top-0 z-10 shadow-sm">
        <tr>
          <th className={TH}>お名前</th>
          <th className={TH}>来院</th>
          <th className={TH}>前回</th>
          <th className={TH}>次回</th>
          <th className={TH}>主担当</th>
        </tr>
      </thead>
      <tbody>
        {patients.map((patient, index) => {
          const infectious = patient.has_infectious_disease
          const td = listCellClassName(infectious)
          return (
            <tr key={patient.id} className={listRowClassName(infectious, index)}>
              <td className={td}>
                <Link
                  to={`/patients/${patient.id}`}
                  className="flex min-w-[220px] items-start gap-3"
                >
                  <span className="mt-0.5 shrink-0">
                    <PatientIcon iconId={patient.icon_id} name={patient.name_kanji} />
                  </span>
                  <span className="min-w-0">
                    <span className={`block truncate font-bold ${listNameClassName(infectious)}`}>
                      <span className="underline-offset-[3px] decoration-slate-400 group-hover:underline group-hover:decoration-dotted">
                        {patient.name_kanji}
                        {patient.name_kana ? (
                          <span className={`ml-2 font-medium ${listKanaClassName(infectious)}`}>
                            {patient.name_kana}
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
                      {patient.chart_number ? `- - ${patient.chart_number}` : '—'}
                      {patient.phone ? ` ${patient.phone}` : ''}
                    </span>
                  </span>
                </Link>
              </td>
              <td className={td}>
                {patient.visit_count != null ? `${patient.visit_count}回` : '—'}
              </td>
              <td className={td}>{formatListDate(patient.last_visit_date)}</td>
              <td className={td}>
                <span className="inline-flex flex-wrap items-center gap-1">
                  <span>
                    {formatNextVisit(patient.next_visit_date, patient.next_visit_time)}
                  </span>
                  {patient.next_visit_provisional ? (
                    <span className="text-xs font-bold text-rose-500">[仮]</span>
                  ) : null}
                </span>
              </td>
              <td className={td}>{patient.primary_doctor_name || '—'}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
