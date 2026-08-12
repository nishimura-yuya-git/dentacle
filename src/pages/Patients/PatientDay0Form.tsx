import { FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { DatePicker } from '@/components/ui/DatePicker'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { TimePicker } from '@/components/ui/TimePicker'
import { WEEKDAY_LABELS, frequencyLabel } from '@/utils/roleLabels'

export type Day0Patient = {
  id: string
  name_kanji: string
  name_kana: string | null
  chart_number: string | null
  area_label: string | null
  address: string | null
  primary_doctor_id: string | null
}

export type Day0Condition = {
  id: string
  visit_frequency: string
  preferred_weekdays: number[] | null
  last_visit_date: string | null
  next_due_date: string | null
  standard_duration_minutes: number
  requires_doctor: boolean
  phone_confirmation_required: boolean
  is_provisional: boolean
  preferred_time_start: string | null
  preferred_time_end: string | null
}

const FREQUENCY_OPTIONS = [
  { value: 'unknown', label: frequencyLabel('unknown') },
  { value: 'weekly', label: frequencyLabel('weekly') },
  { value: 'biweekly', label: frequencyLabel('biweekly') },
  { value: 'monthly', label: frequencyLabel('monthly') },
  { value: 'custom', label: frequencyLabel('custom') },
]

type Props = {
  patient: Day0Patient
  condition: Day0Condition | null
  doctorOptions: Array<{ value: string; label: string }>
  busy: boolean
  onPatientChange: (next: Day0Patient) => void
  onConditionChange: (next: Day0Condition) => void
  onSubmit: (event: FormEvent) => void
}

export function PatientDay0Form({
  patient,
  condition,
  doctorOptions,
  busy,
  onPatientChange,
  onConditionChange,
  onSubmit,
}: Props) {
  const weekdays = condition?.preferred_weekdays ?? []

  function toggleWeekday(day: number) {
    if (!condition) return
    const set = new Set(weekdays)
    if (set.has(day)) set.delete(day)
    else set.add(day)
    onConditionChange({
      ...condition,
      preferred_weekdays: Array.from(set).sort((a, b) => a - b),
    })
  }

  return (
    <section className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm md:p-8">
      <h2 className="text-sm font-bold text-slate-900">基本情報・訪問条件</h2>
      <form onSubmit={onSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
        <Input
          label="氏名（漢字）"
          value={patient.name_kanji}
          onChange={(e) => onPatientChange({ ...patient, name_kanji: e.target.value })}
          required
        />
        <Input
          label="氏名（カナ）"
          value={patient.name_kana ?? ''}
          onChange={(e) => onPatientChange({ ...patient, name_kana: e.target.value })}
        />
        <Input
          label="カルテ番号"
          value={patient.chart_number ?? ''}
          onChange={(e) => onPatientChange({ ...patient, chart_number: e.target.value })}
        />
        <Input
          label="エリア"
          value={patient.area_label ?? ''}
          onChange={(e) => onPatientChange({ ...patient, area_label: e.target.value })}
        />
        <div className="md:col-span-2">
          <Input
            label="住所"
            value={patient.address ?? ''}
            onChange={(e) => onPatientChange({ ...patient, address: e.target.value })}
          />
        </div>
        <Select
          label="主担当医師"
          value={patient.primary_doctor_id ?? ''}
          onChange={(e) =>
            onPatientChange({ ...patient, primary_doctor_id: e.target.value || null })
          }
          options={doctorOptions}
        />
        {condition ? (
          <>
            <Select
              label="訪問頻度"
              value={condition.visit_frequency}
              onChange={(e) =>
                onConditionChange({ ...condition, visit_frequency: e.target.value })
              }
              options={FREQUENCY_OPTIONS}
            />
            <DatePicker
              label="最終訪問日"
              value={condition.last_visit_date ?? ''}
              clearable
              onChange={(next) =>
                onConditionChange({
                  ...condition,
                  last_visit_date: next || null,
                })
              }
            />
            <DatePicker
              label="次回目安日"
              value={condition.next_due_date ?? ''}
              clearable
              onChange={(next) =>
                onConditionChange({
                  ...condition,
                  next_due_date: next || null,
                })
              }
            />
            <Input
              label="標準所要（分）"
              type="number"
              min={1}
              value={String(condition.standard_duration_minutes)}
              onChange={(e) =>
                onConditionChange({
                  ...condition,
                  standard_duration_minutes: Number(e.target.value) || 30,
                })
              }
            />
            <TimePicker
              label="希望開始時刻"
              value={(condition.preferred_time_start ?? '').slice(0, 5)}
              onChange={(next) =>
                onConditionChange({
                  ...condition,
                  preferred_time_start: next || null,
                })
              }
              minuteStep={5}
            />
            <TimePicker
              label="希望終了時刻"
              value={(condition.preferred_time_end ?? '').slice(0, 5)}
              onChange={(next) =>
                onConditionChange({
                  ...condition,
                  preferred_time_end: next || null,
                })
              }
              minuteStep={5}
            />
            <div className="md:col-span-2">
              <p className="mb-2 text-sm font-bold text-slate-800">希望曜日</p>
              <div className="flex flex-wrap gap-2">
                {WEEKDAY_LABELS.map((label, day) => {
                  const checked = weekdays.includes(day)
                  return (
                    <label
                      key={day}
                      className={[
                        'inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition',
                        checked
                          ? 'border-[#008C01] bg-[#008C01]/10 text-[#008C01]'
                          : 'border-slate-200 bg-white text-slate-600',
                      ].join(' ')}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={() => toggleWeekday(day)}
                      />
                      {label}
                    </label>
                  )
                })}
              </div>
            </div>
            <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
              <input
                type="checkbox"
                checked={condition.requires_doctor}
                onChange={(e) =>
                  onConditionChange({ ...condition, requires_doctor: e.target.checked })
                }
              />
              医師同行が必要
            </label>
            <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
              <input
                type="checkbox"
                checked={condition.phone_confirmation_required}
                onChange={(e) =>
                  onConditionChange({
                    ...condition,
                    phone_confirmation_required: e.target.checked,
                  })
                }
              />
              電話確認が必要
            </label>
            <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
              <input
                type="checkbox"
                checked={condition.is_provisional}
                onChange={(e) =>
                  onConditionChange({ ...condition, is_provisional: e.target.checked })
                }
              />
              仮データ（要確認）
            </label>
          </>
        ) : (
          <p className="md:col-span-2 text-sm text-slate-500">
            訪問条件が未作成です。保存すると自動作成します。
          </p>
        )}
        <div className="md:col-span-2">
          <Button type="submit" loading={busy}>
            保存する
          </Button>
        </div>
      </form>
    </section>
  )
}
