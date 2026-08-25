import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/Button'
import { DatePicker } from '@/components/ui/DatePicker'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Checkbox } from '@/components/ui/Checkbox'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { ClinicAccessPlaceholder } from '@/features/clinic/ClinicAccessPlaceholder'
import { useClinic } from '@/features/clinic/useClinic'
import { supabase } from '@/lib/supabase'
import { DownloadIcon, PlusIcon } from '@/pages/Patients/PatientActionIcons'
import { PatientSummaryBar } from '@/pages/Patients/PatientSummaryBar'
import { PatientsTable } from '@/pages/Patients/PatientsTable'
import { downloadPatientsCsv } from '@/pages/Patients/exportPatientsCsv'
import { NameChartSearchInput } from '@/pages/Patients/NameChartSearchInput'
import { PatientIconPicker } from '@/pages/Patients/PatientIconPicker'
import {
  resolvePatientIconId,
  withPatientIcon,
  type PatientIconId,
} from '@/pages/Patients/patientIconPolicy'
import type { PatientListRow, StaffOption } from '@/pages/Patients/patientListTypes'
import type { Json } from '@/types/database.types'

/** 自動提案の白1枚と同型。角丸カード・外枠・影は置かない。 */
const PATIENTS_ARTICLE_CLASS =
  '-mx-3 -my-2 flex min-h-0 flex-1 flex-col overflow-hidden bg-white px-5 py-5 font-normal leading-[1.7] text-[16px] text-slate-900 md:-mx-4 md:-my-3 md:px-8 md:py-6'

/** Asia/Tokyo の当月開始（ISO）。今月新規は created_at 基準 */
function startOfMonthTokyoIso(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const year = parts.find((p) => p.type === 'year')?.value ?? '1970'
  const month = parts.find((p) => p.type === 'month')?.value ?? '01'
  return `${year}-${month}-01T00:00:00+09:00`
}

function isCreatedThisMonthTokyo(createdAt: string | null | undefined, monthStartMs: number): boolean {
  if (!createdAt) return false
  const ms = Date.parse(createdAt)
  return Number.isFinite(ms) && ms >= monthStartMs
}

const EMPTY_FORM = {
  name_kanji: '',
  name_kana: '',
  chart_number: '',
  area_label: '',
  address: '',
  primary_doctor_id: '',
  last_visit_date: '',
  icon_id: '1' as PatientIconId,
  has_infectious_disease: false,
}

function readVisitCount(metadata: unknown): number | null {
  if (!metadata || typeof metadata !== 'object') return null
  const value = (metadata as { visit_count?: unknown }).visit_count
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function PatientsPage() {
  const { clinic, clinicReady } = useClinic()
  const toast = useToast()
  const [patients, setPatients] = useState<PatientListRow[]>([])
  const [staff, setStaff] = useState<StaffOption[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [totalPatients, setTotalPatients] = useState(0)
  const [newPatientsThisMonth, setNewPatientsThisMonth] = useState(0)

  const load = useCallback(async () => {
    if (!clinic) {
      setPatients([])
      setStaff([])
      setTotalPatients(0)
      setNewPatientsThisMonth(0)
      return
    }
    setLoading(true)
    const today = new Date().toISOString().slice(0, 10)
    const monthStartMs = Date.parse(startOfMonthTokyoIso())
    const [patientsRes, staffRes, visitsRes] = await Promise.all([
      supabase
        .from('patients')
        .select(
          'id, name_kanji, name_kana, chart_number, phone, primary_doctor_id, has_infectious_disease, metadata, created_at, patient_visit_conditions(last_visit_date), staff_members!patients_primary_doctor_id_fkey(display_name)',
        )
        .eq('clinic_id', clinic.id)
        .is('deleted_at', null)
        .order('name_kanji', { ascending: true }),
      supabase
        .from('staff_members')
        .select('id, display_name, staff_type')
        .eq('clinic_id', clinic.id)
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('display_name'),
      supabase
        .from('visits')
        .select('patient_id, scheduled_date, start_time, status')
        .eq('clinic_id', clinic.id)
        .is('deleted_at', null)
        .gte('scheduled_date', today)
        .neq('status', 'cancelled')
        .order('scheduled_date', { ascending: true })
        .order('start_time', { ascending: true }),
    ])
    setLoading(false)
    if (patientsRes.error || staffRes.error) {
      toast.error(
        patientsRes.error?.message || staffRes.error?.message || '読込に失敗しました',
      )
      return
    }

    const nextByPatient = new Map<
      string,
      { date: string; time: string | null; provisional: boolean }
    >()
    for (const visit of visitsRes.data ?? []) {
      if (nextByPatient.has(visit.patient_id)) continue
      nextByPatient.set(visit.patient_id, {
        date: visit.scheduled_date,
        time: visit.start_time,
        provisional: visit.status === 'tentative',
      })
    }

    const sourceRows = patientsRes.data ?? []
    const rows: PatientListRow[] = sourceRows.map((row) => {
      const conditions = row.patient_visit_conditions as
        | { last_visit_date: string | null }
        | { last_visit_date: string | null }[]
        | null
      const condition = Array.isArray(conditions) ? conditions[0] : conditions
      const doctor = row.staff_members as { display_name: string } | null
      const next = nextByPatient.get(row.id)
      return {
        id: row.id,
        name_kanji: row.name_kanji,
        name_kana: row.name_kana,
        chart_number: row.chart_number,
        phone: row.phone,
        primary_doctor_id: row.primary_doctor_id,
        primary_doctor_name: doctor?.display_name ?? null,
        last_visit_date: condition?.last_visit_date ?? null,
        next_visit_date: next?.date ?? null,
        next_visit_time: next?.time ?? null,
        next_visit_provisional: next?.provisional ?? false,
        visit_count: readVisitCount(row.metadata),
        icon_id: resolvePatientIconId(row.metadata, row.id),
        has_infectious_disease: row.has_infectious_disease === true,
      }
    })

    setPatients(rows)
    setTotalPatients(sourceRows.length)
    setNewPatientsThisMonth(
      sourceRows.filter((row) => isCreatedThisMonthTokyo(row.created_at, monthStartMs)).length,
    )
    setStaff(staffRes.data ?? [])
  }, [clinic, toast])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim()
    if (!q) return patients
    return patients.filter((p) => {
      const hay = `${p.name_kanji} ${p.name_kana ?? ''} ${p.chart_number ?? ''}`
      return hay.includes(q)
    })
  }, [patients, search])

  const doctorOptions = useMemo(
    () => [
      { value: '', label: '未設定' },
      ...staff
        .filter((s) => s.staff_type === 'doctor')
        .map((s) => ({ value: s.id, label: s.display_name })),
    ],
    [staff],
  )

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    if (!clinic) return
    setBusy(true)
    const { data: created, error: insertError } = await supabase
      .from('patients')
      .insert({
        clinic_id: clinic.id,
        name_kanji: form.name_kanji.trim(),
        name_kana: form.name_kana.trim() || null,
        chart_number: form.chart_number.trim() || null,
        area_label: form.area_label.trim() || null,
        address: form.address.trim() || null,
        primary_doctor_id: form.primary_doctor_id || null,
        has_infectious_disease: form.has_infectious_disease,
        metadata: withPatientIcon({}, form.icon_id) as Json,
      })
      .select('id')
      .single()
    if (insertError || !created) {
      setBusy(false)
      toast.error(insertError?.message ?? '登録に失敗しました')
      return
    }
    await supabase.from('patient_visit_conditions').insert({
      clinic_id: clinic.id,
      patient_id: created.id,
      visit_frequency: 'unknown',
      preferred_weekdays: [],
      last_visit_date: form.last_visit_date || null,
      is_provisional: true,
      phone_confirmation_required: true,
    })
    setBusy(false)
    toast.success('患者を登録しました')
    setForm(EMPTY_FORM)
    setModalOpen(false)
    await load()
  }

  function handleExport() {
    if (filtered.length === 0) {
      toast.error('出力できる患者がありません。')
      return
    }
    const stamp = new Date().toISOString().slice(0, 10)
    downloadPatientsCsv(
      filtered.map((p) => ({
        name_kanji: p.name_kanji,
        name_kana: p.name_kana,
        chart_number: p.chart_number,
        area_label: null,
        address: null,
      })),
      `患者一覧_${stamp}.csv`,
    )
    toast.success(`${filtered.length}件をCSV出力しました`)
  }

  const listActions = (
    <div className="flex flex-nowrap items-center gap-2">
      <NameChartSearchInput
        id="patient-list-search"
        value={search}
        onChange={setSearch}
      />
      <Button
        variant="soft"
        className="!px-4 !py-2.5 !text-sm !font-medium"
        onClick={handleExport}
      >
        <DownloadIcon />
        データ出力
      </Button>
      <Button
        variant="soft"
        className="!px-4 !py-2.5 !text-sm !font-medium"
        onClick={() => setModalOpen(true)}
      >
        <PlusIcon />
        新規患者登録
      </Button>
    </div>
  )

  if (!clinicReady) {
    return (
      <DashboardLayout title="患者管理" fillViewport>
        <article className={PATIENTS_ARTICLE_CLASS}>
          <ClinicAccessPlaceholder />
        </article>
      </DashboardLayout>
    )
  }

  if (!clinic) {
    return (
      <DashboardLayout title="患者管理" fillViewport>
        <article className={PATIENTS_ARTICLE_CLASS}>
          <p className="text-sm text-slate-500">クリニックを選択または作成してください。</p>
        </article>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="患者管理" fillViewport actions={listActions}>
      <article className={PATIENTS_ARTICLE_CLASS}>
        <div className="flex shrink-0 items-end">
          <PatientSummaryBar
            totalPatients={totalPatients}
            newPatientsThisMonth={newPatientsThisMonth}
            visibleCount={filtered.length}
            searching={Boolean(search.trim())}
            loading={loading}
          />
        </div>

        <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-auto rounded-2xl border border-slate-200 bg-white">
          {loading ? (
            <div className="flex min-h-[8rem] flex-1 items-center justify-center">
              <p className="text-sm text-slate-400">患者一覧を読み込んでいます…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex min-h-[8rem] flex-1 items-center justify-center px-4">
              <p className="text-center text-sm text-slate-400">
                該当する患者がありません。右上の「新規患者登録」またはアカウントメニューの「CSV取込」から追加してください。
              </p>
            </div>
          ) : (
            <PatientsTable patients={filtered} />
          )}
        </div>
      </article>

      <Modal
        isOpen={modalOpen}
        title="新規患者登録"
        onClose={() => setModalOpen(false)}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              キャンセル
            </Button>
            <Button type="submit" form="create-patient-form" loading={busy}>
              登録する
            </Button>
          </div>
        }
      >
        <form id="create-patient-form" onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
          <PatientIconPicker
            value={form.icon_id}
            disabled={busy}
            onChange={(iconId) => setForm((current) => ({ ...current, icon_id: iconId }))}
          />
          <Input
            label="氏名（漢字）"
            value={form.name_kanji}
            onChange={(e) => setForm((f) => ({ ...f, name_kanji: e.target.value }))}
            required
          />
          <Input
            label="氏名（カナ）"
            value={form.name_kana}
            onChange={(e) => setForm((f) => ({ ...f, name_kana: e.target.value }))}
          />
          <Input
            label="カルテ番号"
            value={form.chart_number}
            onChange={(e) => setForm((f) => ({ ...f, chart_number: e.target.value }))}
          />
          <Input
            label="エリア"
            value={form.area_label}
            onChange={(e) => setForm((f) => ({ ...f, area_label: e.target.value }))}
          />
          <div className="md:col-span-2">
            <Input
              label="住所"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
          </div>
          <Select
            label="主担当医師"
            value={form.primary_doctor_id}
            onChange={(e) => setForm((f) => ({ ...f, primary_doctor_id: e.target.value }))}
            options={doctorOptions}
          />
          <DatePicker
            label="最終訪問日（任意）"
            value={form.last_visit_date}
            clearable
            onChange={(next) => setForm((f) => ({ ...f, last_visit_date: next }))}
          />
          <div className="md:col-span-2">
            <Checkbox
              label="感染症"
              checked={form.has_infectious_disease}
              onChange={(next) =>
                setForm((current) => ({ ...current, has_infectious_disease: next }))
              }
            />
            <p className="mt-1 text-xs font-medium text-slate-400">
              器具・接触に注意。他の患者へうつさない
            </p>
          </div>
          <p className="md:col-span-2 text-xs font-medium text-slate-400">
            訪問頻度は未設定の仮条件で登録します。電話確認で育成してください。
          </p>
        </form>
      </Modal>
    </DashboardLayout>
  )
}
