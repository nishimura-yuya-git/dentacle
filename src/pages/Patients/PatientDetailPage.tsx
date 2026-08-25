import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/features/auth/useAuth'
import { ClinicAccessPlaceholder } from '@/features/clinic/ClinicAccessPlaceholder'
import { useClinic } from '@/features/clinic/useClinic'
import { supabase } from '@/lib/supabase'
import { WEEKDAY_LABELS } from '@/utils/roleLabels'
import { AddConstraintModal } from '@/pages/Patients/AddConstraintModal'
import { PatientConfirmedVisitSection } from '@/pages/Patients/PatientConfirmedVisitSection'
import {
  PatientDay0Form,
  type Day0Condition,
  type Day0Patient,
} from '@/pages/Patients/PatientDay0Form'
import { resolvePatientIconId, withPatientIcon } from '@/pages/Patients/patientIconPolicy'
import {
  constraintTypeFromKind,
  isExceptionConstraintRow,
  leftoverAllDayUnavailableIds,
  planWeekdayTimeSaves,
  sliceTimeHm,
  validateWeekdayWindows,
  windowsFromConstraintRows,
  type ConstraintTimeRow,
  type WeekdayTimeWindow,
} from '@/pages/Patients/weekdayUnavailable'
import type { Json } from '@/types/database.types'

type Constraint = ConstraintTimeRow & {
  note: string | null
}

type StaffOption = { id: string; display_name: string; staff_type: string }

const CONSTRAINT_TYPE_LABEL: Record<string, string> = {
  ng: 'NG',
  unavailable: '不可',
  available: '可',
}

const CONDITION_SELECT =
  'id, visit_frequency, preferred_weekdays, last_visit_date, next_due_date, standard_duration_minutes, requires_doctor, phone_confirmation_required, is_provisional, preferred_time_start, preferred_time_end'

const CONSTRAINT_SELECT =
  'id, constraint_type, day_of_week, specific_date, note, start_time, end_time'

export function PatientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { clinic, clinicReady } = useClinic()
  const { user } = useAuth()
  const toast = useToast()
  const [patient, setPatient] = useState<Day0Patient | null>(null)
  const [condition, setCondition] = useState<Day0Condition | null>(null)
  const [constraints, setConstraints] = useState<Constraint[]>([])
  const [weekdayWindows, setWeekdayWindows] = useState<WeekdayTimeWindow[]>([])
  const [staff, setStaff] = useState<StaffOption[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [constraintOpen, setConstraintOpen] = useState(false)

  const load = useCallback(async () => {
    if (!clinic || !id) return
    setLoading(true)
    const [patientRes, condRes, constRes, staffRes] = await Promise.all([
      supabase
        .from('patients')
        .select(
          'id, name_kanji, name_kana, chart_number, area_label, address, primary_doctor_id, has_infectious_disease, metadata'
        )
        .eq('clinic_id', clinic.id)
        .eq('id', id)
        .is('deleted_at', null)
        .maybeSingle(),
      supabase
        .from('patient_visit_conditions')
        .select(CONDITION_SELECT)
        .eq('clinic_id', clinic.id)
        .eq('patient_id', id)
        .is('deleted_at', null)
        .maybeSingle(),
      supabase
        .from('patient_constraints')
        .select(CONSTRAINT_SELECT)
        .eq('clinic_id', clinic.id)
        .eq('patient_id', id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
      supabase
        .from('staff_members')
        .select('id, display_name, staff_type')
        .eq('clinic_id', clinic.id)
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('display_name'),
    ])
    setLoading(false)

    if (patientRes.error || condRes.error || constRes.error || staffRes.error) {
      toast.error(
        patientRes.error?.message ||
          condRes.error?.message ||
          constRes.error?.message ||
          staffRes.error?.message ||
          '読込に失敗しました'
      )
      return
    }
    if (!patientRes.data) {
      setPatient(null)
      toast.error('患者が見つかりません')
      return
    }
    const row = patientRes.data
    setPatient({
      id: row.id,
      name_kanji: row.name_kanji,
      name_kana: row.name_kana,
      chart_number: row.chart_number,
      area_label: row.area_label,
      address: row.address,
      primary_doctor_id: row.primary_doctor_id,
      icon_id: resolvePatientIconId(row.metadata, row.id),
      has_infectious_disease: row.has_infectious_disease === true,
      metadata: row.metadata,
    })
    setCondition(condRes.data)
    const loadedConstraints = constRes.data ?? []
    setConstraints(loadedConstraints)
    setWeekdayWindows(windowsFromConstraintRows(loadedConstraints))
    setStaff(staffRes.data ?? [])
  }, [clinic, id])

  useEffect(() => {
    void load()
  }, [load])

  const doctorOptions = useMemo(
    () => [
      { value: '', label: '未設定' },
      ...staff
        .filter((s) => s.staff_type === 'doctor')
        .map((s) => ({ value: s.id, label: s.display_name })),
    ],
    [staff]
  )

  const otherConstraints = useMemo(
    () => constraints.filter((row) => isExceptionConstraintRow(row)),
    [constraints],
  )

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    if (!clinic || !patient) return
    const check = validateWeekdayWindows(weekdayWindows)
    if (!check.ok) {
      toast.error(check.message)
      return
    }
    setBusy(true)

    const { error: patientError } = await supabase
      .from('patients')
      .update({
        name_kanji: patient.name_kanji.trim(),
        name_kana: patient.name_kana?.trim() || null,
        chart_number: patient.chart_number?.trim() || null,
        area_label: patient.area_label?.trim() || null,
        address: patient.address?.trim() || null,
        primary_doctor_id: patient.primary_doctor_id || null,
        has_infectious_disease: patient.has_infectious_disease,
        metadata: withPatientIcon(patient.metadata, patient.icon_id) as Json,
      })
      .eq('id', patient.id)
      .eq('clinic_id', clinic.id)
      .is('deleted_at', null)

    if (patientError) {
      setBusy(false)
      toast.error(patientError.message)
      return
    }

    if (condition) {
      const { error: condError } = await supabase
        .from('patient_visit_conditions')
        .update({
          visit_frequency: condition.visit_frequency,
          preferred_weekdays: condition.preferred_weekdays ?? [],
          last_visit_date: condition.last_visit_date || null,
          next_due_date: condition.next_due_date || null,
          standard_duration_minutes: condition.standard_duration_minutes,
          requires_doctor: condition.requires_doctor,
          phone_confirmation_required: condition.phone_confirmation_required,
          is_provisional: condition.is_provisional,
          preferred_time_start: condition.preferred_time_start || null,
          preferred_time_end: condition.preferred_time_end || null,
        })
        .eq('id', condition.id)
        .eq('clinic_id', clinic.id)
        .is('deleted_at', null)

      if (condError) {
        setBusy(false)
        toast.error(condError.message)
        return
      }
    } else {
      const { data: created, error: createError } = await supabase
        .from('patient_visit_conditions')
        .insert({
          clinic_id: clinic.id,
          patient_id: patient.id,
          visit_frequency: 'unknown',
          preferred_weekdays: [],
          is_provisional: true,
        })
        .select(CONDITION_SELECT)
        .single()
      if (createError) {
        setBusy(false)
        toast.error(createError.message)
        return
      }
      setCondition(created)
    }

    const windowError = await persistWeekdayWindows(
      clinic.id,
      patient.id,
      constraints,
      weekdayWindows,
    )
    if (windowError) {
      setBusy(false)
      toast.error(windowError)
      return
    }

    setBusy(false)
    toast.success('保存しました')
    await load()
  }

  async function handleAddConstraint(payload: {
    constraint_type: string
    day_of_week: number | null
    specific_date: string | null
    note: string | null
  }) {
    if (!clinic || !patient) return
    if (payload.day_of_week == null && !payload.specific_date) {
      toast.error('曜日または日付を指定してください')
      return
    }
    setBusy(true)
    const { error: insertError } = await supabase.from('patient_constraints').insert({
      clinic_id: clinic.id,
      patient_id: patient.id,
      constraint_type: payload.constraint_type,
      day_of_week: payload.day_of_week,
      specific_date: payload.specific_date,
      note: payload.note,
      source: 'manual',
      is_hard: true,
    })
    setBusy(false)
    if (insertError) {
      toast.error(insertError.message)
      return
    }
    setConstraintOpen(false)
    toast.success('例外を追加しました')
    await load()
  }

  if (!clinicReady) {
    return (
      <DashboardLayout title="患者管理">
        <ClinicAccessPlaceholder />
      </DashboardLayout>
    )
  }

  if (!clinic) {
    return (
      <DashboardLayout title="患者管理">
        <p className="text-sm text-slate-500">クリニックを選択または作成してください。</p>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      title="患者管理"
      description="患者情報と訪問条件の編集"
      actions={
        <Link to="/patients">
          <Button variant="secondary">患者一覧へ戻る</Button>
        </Link>
      }
    >
      <div className="space-y-6">
        {loading || !patient ? (
          <p className="text-sm text-slate-400">
            {loading ? '読み込み中…' : '患者データがありません'}
          </p>
        ) : (
          <>
            <PatientDay0Form
              patient={patient}
              condition={condition}
              weekdayWindows={weekdayWindows}
              doctorOptions={doctorOptions}
              busy={busy}
              onPatientChange={setPatient}
              onConditionChange={setCondition}
              onWeekdayWindowsChange={setWeekdayWindows}
              onAddException={() => setConstraintOpen(true)}
              onSubmit={handleSave}
            />

            <PatientConfirmedVisitSection
              clinicId={clinic.id}
              patientId={patient.id}
              userId={user?.id ?? null}
              preferredStart={condition?.preferred_time_start ?? null}
              durationMinutes={condition?.standard_duration_minutes ?? null}
            />

            <section className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm md:p-8">
              <div>
                <h2 className="text-sm font-bold text-slate-900">例外・NG</h2>
                <p className="mt-1 text-xs font-medium text-slate-400">
                  追加は上の希望曜日から。この日だけ行けない場合や NG が一覧になります
                </p>
              </div>
              {otherConstraints.length === 0 ? (
                <p className="mt-4 text-sm text-slate-400">
                  例外はまだありません。希望曜日の「例外を追加」から登録できます
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-slate-100">
                  {otherConstraints.map((c) => (
                    <li key={c.id} className="py-3">
                      <p className="text-sm font-bold text-slate-900">
                        {CONSTRAINT_TYPE_LABEL[c.constraint_type] ?? c.constraint_type}
                        {' · '}
                        {c.specific_date
                          ? c.specific_date
                          : c.day_of_week != null
                            ? WEEKDAY_LABELS[c.day_of_week]
                            : '—'}
                        {sliceTimeHm(c.start_time) && sliceTimeHm(c.end_time)
                          ? ` · ${sliceTimeHm(c.start_time)}〜${sliceTimeHm(c.end_time)}`
                          : ''}
                      </p>
                      {c.note ? (
                        <p className="mt-1 text-xs font-medium text-slate-400">{c.note}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>

      <AddConstraintModal
        isOpen={constraintOpen}
        busy={busy}
        onClose={() => setConstraintOpen(false)}
        onSubmit={handleAddConstraint}
      />
    </DashboardLayout>
  )
}

async function persistWeekdayWindows(
  clinicId: string,
  patientId: string,
  existing: Constraint[],
  draft: WeekdayTimeWindow[],
): Promise<string | null> {
  const existingWindows = windowsFromConstraintRows(existing)
  const plan = planWeekdayTimeSaves(existingWindows, draft)
  const deleteIds = [
    ...plan.deleteIds,
    ...leftoverAllDayUnavailableIds(existing, existingWindows),
  ]

  if (plan.insert.length > 0) {
    const { error } = await supabase.from('patient_constraints').insert(
      plan.insert.map((row) => ({
        clinic_id: clinicId,
        patient_id: patientId,
        constraint_type: constraintTypeFromKind(row.kind),
        day_of_week: row.dayOfWeek,
        start_time: row.allDay ? null : row.start,
        end_time: row.allDay ? null : row.end,
        source: 'manual',
        is_hard: true,
      })),
    )
    if (error) return error.message
  }

  for (const row of plan.update) {
    if (!row.id) continue
    const { error } = await supabase
      .from('patient_constraints')
      .update({
        constraint_type: constraintTypeFromKind(row.kind),
        day_of_week: row.dayOfWeek,
        start_time: row.allDay ? null : row.start,
        end_time: row.allDay ? null : row.end,
      })
      .eq('id', row.id)
      .eq('clinic_id', clinicId)
      .is('deleted_at', null)
    if (error) return error.message
  }

  if (deleteIds.length > 0) {
    const { error } = await supabase
      .from('patient_constraints')
      .update({ deleted_at: new Date().toISOString() })
      .in('id', deleteIds)
      .eq('clinic_id', clinicId)
      .is('deleted_at', null)
    if (error) return error.message
  }

  return null
}
