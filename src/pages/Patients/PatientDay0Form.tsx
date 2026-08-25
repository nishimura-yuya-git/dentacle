import { FormEvent, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { DatePicker } from '@/components/ui/DatePicker'
import { Input } from '@/components/ui/Input'
import { NumberStepper } from '@/components/ui/NumberStepper'
import { Select } from '@/components/ui/Select'
import { TimePicker } from '@/components/ui/TimePicker'
import { PatientIconPicker } from '@/pages/Patients/PatientIconPicker'
import { PreferredWeekdaysField } from '@/pages/Patients/PreferredWeekdaysField'
import type { PatientIconId } from '@/pages/Patients/patientIconPolicy'
import type { WeekdayTimeWindow } from '@/pages/Patients/weekdayUnavailable'
import { frequencyLabel } from '@/utils/roleLabels'

export type Day0Patient = {
  id: string
  name_kanji: string
  name_kana: string | null
  chart_number: string | null
  area_label: string | null
  address: string | null
  primary_doctor_id: string | null
  icon_id: PatientIconId
  has_infectious_disease: boolean
  metadata: unknown
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
  weekdayWindows: WeekdayTimeWindow[]
  doctorOptions: Array<{ value: string; label: string }>
  busy: boolean
  onPatientChange: (next: Day0Patient) => void
  onConditionChange: (next: Day0Condition) => void
  onWeekdayWindowsChange: (next: WeekdayTimeWindow[]) => void
  onAddException?: () => void
  onSubmit: (event: FormEvent) => void
}

export function PatientDay0Form({
  patient,
  condition,
  weekdayWindows,
  doctorOptions,
  busy,
  onPatientChange,
  onConditionChange,
  onWeekdayWindowsChange,
  onAddException,
  onSubmit,
}: Props) {
  const weekdays = condition?.preferred_weekdays ?? []

  function setWeekdays(next: number[]) {
    if (!condition) return
    onConditionChange({
      ...condition,
      preferred_weekdays: [...new Set(next)]
        .filter((day) => day >= 0 && day <= 6)
        .sort((a, b) => a - b),
    })
  }

  function toggleWeekday(day: number) {
    setWeekdays(
      weekdays.includes(day)
        ? weekdays.filter((item) => item !== day)
        : [...weekdays, day],
    )
  }

  return (
    <section className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm md:p-8">
      <h2 className="text-sm font-bold text-slate-900">基本情報・訪問条件</h2>
      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        <PatientIconPicker
          className=""
          value={patient.icon_id}
          disabled={busy}
          onChange={(iconId) => onPatientChange({ ...patient, icon_id: iconId })}
        />
        <div className="flex flex-wrap gap-x-4 gap-y-4">
          <FieldCell className="w-[16rem]">
            <Input
              label="氏名（漢字）"
              value={patient.name_kanji}
              onChange={(e) => onPatientChange({ ...patient, name_kanji: e.target.value })}
              required
            />
          </FieldCell>
          <FieldCell className="w-[16rem]">
            <Input
              label="氏名（カナ）"
              value={patient.name_kana ?? ''}
              onChange={(e) => onPatientChange({ ...patient, name_kana: e.target.value })}
            />
          </FieldCell>
          <FieldCell className="w-[12rem]">
            <Input
              label="カルテ番号"
              value={patient.chart_number ?? ''}
              onChange={(e) => onPatientChange({ ...patient, chart_number: e.target.value })}
            />
          </FieldCell>
          <FieldCell className="w-[12rem]">
            <Input
              label="エリア"
              value={patient.area_label ?? ''}
              onChange={(e) => onPatientChange({ ...patient, area_label: e.target.value })}
            />
          </FieldCell>
        </div>
        <Input
          label="住所"
          value={patient.address ?? ''}
          onChange={(e) => onPatientChange({ ...patient, address: e.target.value })}
        />
        <div className="flex flex-wrap gap-x-4 gap-y-4">
          <FieldCell className="w-[16rem]">
            <Select
              label="主担当医師"
              value={patient.primary_doctor_id ?? ''}
              onChange={(e) =>
                onPatientChange({ ...patient, primary_doctor_id: e.target.value || null })
              }
              options={doctorOptions}
            />
          </FieldCell>
          {condition ? (
            <>
              <FieldCell className="w-[13rem]">
                <Select
                  label="訪問頻度"
                  value={condition.visit_frequency}
                  onChange={(e) =>
                    onConditionChange({ ...condition, visit_frequency: e.target.value })
                  }
                  options={FREQUENCY_OPTIONS}
                />
              </FieldCell>
              <FieldCell className="w-[13rem]">
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
              </FieldCell>
              <FieldCell className="w-[13rem]">
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
              </FieldCell>
            </>
          ) : null}
        </div>
        {condition ? (
          <>
            <div className="flex flex-wrap gap-x-4 gap-y-4">
              <FieldCell className="w-[12rem]">
                <NumberStepper
                  label="標準所要（分）"
                  value={condition.standard_duration_minutes}
                  min={1}
                  max={240}
                  step={5}
                  onChange={(next) =>
                    onConditionChange({
                      ...condition,
                      standard_duration_minutes: next,
                    })
                  }
                />
              </FieldCell>
              <FieldCell className="w-[11rem]">
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
              </FieldCell>
              <FieldCell className="w-[11rem]">
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
              </FieldCell>
            </div>
            <PreferredWeekdaysField
              weekdays={weekdays}
              windows={weekdayWindows}
              disabled={busy}
              onWeekdaysChange={setWeekdays}
              onToggleWeekday={toggleWeekday}
              onWindowsChange={onWeekdayWindowsChange}
              onAddException={onAddException}
            />
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              <Checkbox
                label="医師同行が必要"
                checked={condition.requires_doctor}
                onChange={(next) =>
                  onConditionChange({ ...condition, requires_doctor: next })
                }
              />
              <Checkbox
                label="電話確認が必要"
                checked={condition.phone_confirmation_required}
                onChange={(next) =>
                  onConditionChange({
                    ...condition,
                    phone_confirmation_required: next,
                  })
                }
              />
              <Checkbox
                label="仮データ（要確認）"
                checked={condition.is_provisional}
                onChange={(next) =>
                  onConditionChange({ ...condition, is_provisional: next })
                }
              />
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-500">
            訪問条件が未作成です。保存すると自動作成します。
          </p>
        )}
        <div>
          <Checkbox
            label="感染症"
            checked={patient.has_infectious_disease}
            onChange={(next) =>
              onPatientChange({ ...patient, has_infectious_disease: next })
            }
          />
          <p className="mt-1 text-xs font-medium text-slate-400">
            器具・接触に注意。他の患者へうつさない
          </p>
        </div>
        <div>
          <Button type="submit" loading={busy}>
            保存する
          </Button>
        </div>
      </form>
    </section>
  )
}

function FieldCell({ className, children }: { className: string; children: ReactNode }) {
  return <div className={`max-w-full ${className}`}>{children}</div>
}
