import { FormEvent, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { DatePicker } from '@/components/ui/DatePicker'
import { Select } from '@/components/ui/Select'
import { TimePicker } from '@/components/ui/TimePicker'
import { useToast } from '@/components/ui/Toast'
import {
  defaultConfirmedVisitTimes,
  formatConfirmedVisitLine,
  todayIsoDate,
} from '@/pages/Patients/patientConfirmedVisit'
import { usePatientConfirmedVisits } from '@/pages/Patients/usePatientConfirmedVisits'

type Props = {
  clinicId: string
  patientId: string
  userId: string | null
  preferredStart: string | null
  durationMinutes: number | null
}

export function PatientConfirmedVisitSection({
  clinicId,
  patientId,
  userId,
  preferredStart,
  durationMinutes,
}: Props) {
  const toast = useToast()
  const { teams, rows, loading, busy, error, register } = usePatientConfirmedVisits({
    clinicId,
    patientId,
    userId,
  })
  const defaults = useMemo(
    () => defaultConfirmedVisitTimes({ preferredStart, durationMinutes }),
    [preferredStart, durationMinutes],
  )
  const [date, setDate] = useState(todayIsoDate)
  const [start, setStart] = useState(defaults.start)
  const [end, setEnd] = useState(defaults.end)
  const [teamId, setTeamId] = useState('')

  const selectedTeam = teamId || teams[0]?.value || ''

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const result = await register({
      date,
      start,
      end,
      teamId: selectedTeam,
    })
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    toast.success(result.message)
  }

  return (
    <section className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm md:p-8">
      <h2 className="text-sm font-bold text-slate-900">確定済みの訪問</h2>
      <p className="mt-1 text-xs font-medium leading-relaxed text-slate-400">
        この日時は本予約として残します。自動提案はこの時間を空けて他の人で埋めます。上の希望曜日・希望時刻とは別です。
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="flex flex-wrap gap-x-4 gap-y-4">
          <div className="w-[13rem] max-w-full">
            <DatePicker label="日付" value={date} required onChange={setDate} />
          </div>
          <div className="w-[11rem] max-w-full">
            <TimePicker label="開始" value={start} minuteStep={5} onChange={setStart} />
          </div>
          <div className="w-[11rem] max-w-full">
            <TimePicker label="終了" value={end} minuteStep={5} onChange={setEnd} />
          </div>
          <div className="w-[14rem] max-w-full">
            <Select
              label="号車"
              value={selectedTeam}
              options={[{ value: '', label: '選択してください' }, ...teams]}
              onChange={(event) => setTeamId(event.target.value)}
            />
          </div>
        </div>
        {error ? <p className="text-sm font-bold text-rose-600">{error}</p> : null}
        <Button type="submit" loading={busy} disabled={!userId}>
          本予約として登録
        </Button>
      </form>

      <div className="mt-8 border-t border-slate-100 pt-6">
        <p className="text-sm font-bold text-slate-800">これからの本予約</p>
        {loading ? (
          <p className="mt-3 text-sm text-slate-400">読み込み中…</p>
        ) : rows.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">これからの本予約はまだありません</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {rows.map((row) => (
              <li key={row.id} className="py-3 text-sm font-bold text-slate-900">
                {formatConfirmedVisitLine(row)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
