import { useCallback, useEffect, useMemo, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/features/auth/useAuth'
import { ClinicAccessPlaceholder } from '@/features/clinic/ClinicAccessPlaceholder'
import { useClinic } from '@/features/clinic/useClinic'
import { writeOperationTrace } from '@/features/calendar/writeOperationTrace'
import { supabase } from '@/lib/supabase'
import { ensureVehicleTeams } from '@/pages/Calendar/utils/ensureVehicleTeams'
import type { ContactRow, PhoneStatus } from '@/pages/Contacts/contactListTypes'
import { NameChartSearchInput } from '@/pages/Patients/NameChartSearchInput'
import { ContactsSummaryBar } from '@/pages/Contacts/ContactsSummaryBar'
import { ContactsTable } from '@/pages/Contacts/ContactsTable'
import { toContactRow, type ContactRowSource } from '@/pages/Contacts/mapContactRow'
import { generateAndAdoptDay0ForDate } from '@/pages/Proposals/hooks/proposalActions'
import { phoneStatusLabel } from '@/utils/roleLabels'

/** 患者一覧の白1枚と同型。角丸カード・外枠・影は置かない。 */
const CONTACTS_ARTICLE_CLASS =
  '-mx-3 -my-2 flex min-h-0 flex-1 flex-col overflow-hidden bg-white px-5 py-5 font-normal leading-[1.7] text-[16px] text-slate-900 md:-mx-4 md:-my-3 md:px-8 md:py-6'

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'open', label: '未完了（OK以外）' },
  { value: 'all', label: 'すべて' },
  { value: 'pending', label: phoneStatusLabel('pending') },
  { value: 'ok', label: phoneStatusLabel('ok') },
  { value: 'ng', label: phoneStatusLabel('ng') },
  { value: 'absent', label: phoneStatusLabel('absent') },
  { value: 'callback_waiting', label: phoneStatusLabel('callback_waiting') },
  { value: 'facility_waiting', label: phoneStatusLabel('facility_waiting') },
]

const ACTION_STATUSES: PhoneStatus[] = [
  'ok',
  'ng',
  'absent',
  'callback_waiting',
  'facility_waiting',
]

export function ContactsPage() {
  const { user } = useAuth()
  const { clinic, canWriteOperations, clinicReady } = useClinic()
  const toast = useToast()
  const [rows, setRows] = useState<ContactRow[]>([])
  const [openCount, setOpenCount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [filter, setFilter] = useState('open')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [noteTarget, setNoteTarget] = useState<ContactRow | null>(null)
  const [noteStatus, setNoteStatus] = useState<PhoneStatus>('ng')
  const [noteText, setNoteText] = useState('')

  const loadRows = useCallback(async () => {
    if (!clinic) {
      setRows([])
      setOpenCount(0)
      setPendingCount(0)
      return
    }
    setLoading(true)
    let query = supabase
      .from('visit_phone_confirmations')
      .select(
        'id, status, result_note, contacted_at, visit_id, patient_id, visits(scheduled_date, start_time, end_time, status), patients(name_kanji, name_kana, chart_number, phone, area_label, metadata)',
      )
      .eq('clinic_id', clinic.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(100)

    if (filter === 'open') {
      query = query.neq('status', 'ok')
    } else if (filter !== 'all') {
      query = query.eq('status', filter)
    }

    const [listRes, openRes, pendingRes] = await Promise.all([
      query,
      supabase
        .from('visit_phone_confirmations')
        .select('id', { count: 'exact', head: true })
        .eq('clinic_id', clinic.id)
        .is('deleted_at', null)
        .neq('status', 'ok'),
      supabase
        .from('visit_phone_confirmations')
        .select('id', { count: 'exact', head: true })
        .eq('clinic_id', clinic.id)
        .is('deleted_at', null)
        .eq('status', 'pending'),
    ])

    setLoading(false)
    if (listRes.error) {
      toast.error(listRes.error.message)
      setRows([])
      setSelectedIds(new Set())
      return
    }
    setRows(((listRes.data ?? []) as ContactRowSource[]).map(toContactRow))
    setOpenCount(openRes.count ?? 0)
    setPendingCount(pendingRes.count ?? 0)
    setSelectedIds(new Set())
  }, [clinic, filter, toast])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  const filtered = useMemo(() => {
    const q = search.trim()
    if (!q) return rows
    return rows.filter((row) => {
      const p = row.patients
      const hay = `${p?.name_kanji ?? ''} ${p?.name_kana ?? ''} ${p?.chart_number ?? ''} ${p?.phone ?? ''}`
      return hay.includes(q)
    })
  }, [rows, search])

  function openNoteModal(row: ContactRow, status: PhoneStatus) {
    setNoteTarget(row)
    setNoteStatus(status)
    setNoteText(row.result_note ?? '')
    setNoteModalOpen(true)
  }

  async function applyStatus(
    row: ContactRow,
    status: PhoneStatus,
    resultNote: string | null,
  ) {
    if (!clinic || !user || !canWriteOperations) return
    setBusy(true)

    const now = new Date().toISOString()
    const phoneUpdate: {
      status: PhoneStatus
      result_note: string | null
      contacted_at: string
      contacted_by: string
      updated_by: string
      constraint_candidate?: Record<string, never>
    } = {
      status,
      result_note: resultNote,
      contacted_at: now,
      contacted_by: user.id,
      updated_by: user.id,
    }
    if (status === 'ng') {
      phoneUpdate.constraint_candidate = {}
    }

    const { error: phoneError } = await supabase
      .from('visit_phone_confirmations')
      .update(phoneUpdate)
      .eq('id', row.id)

    if (phoneError) {
      setBusy(false)
      toast.error(phoneError.message)
      return
    }

    if (status === 'ok') {
      const { error: visitError } = await supabase
        .from('visits')
        .update({
          status: 'confirmed',
          updated_by: user.id,
        })
        .eq('id', row.visit_id)
      if (visitError) {
        setBusy(false)
        toast.error(visitError.message)
        return
      }
      void writeOperationTrace({
        clinicId: clinic.id,
        userId: user.id,
        action: 'phone.ok_confirm_visit',
        entityType: 'visit',
        entityId: row.visit_id,
      })
      toast.success('電話確認OK → 本予約に更新しました')
    } else if (status === 'ng') {
      const targetDate = row.visits?.scheduled_date
      const { error: cancelError } = await supabase
        .from('visits')
        .update({
          status: 'cancelled',
          cancelled_at: now,
          cancelled_by: user.id,
          updated_by: user.id,
          updated_at: now,
        })
        .eq('id', row.visit_id)
        .eq('clinic_id', clinic.id)
      if (cancelError) {
        setBusy(false)
        toast.error(cancelError.message)
        return
      }

      let reproposeNote = '電話確認NG → 仮予約を取消しました'
      if (targetDate) {
        try {
          const ensured = await ensureVehicleTeams(clinic.id)
          if (ensured.error) throw new Error(ensured.error)
          const result = await generateAndAdoptDay0ForDate({
            clinicId: clinic.id,
            userId: user.id,
            targetDate,
            vehicleTeamIds: ensured.teams.map((team) => team.id),
            onlyPatientIds: [row.patient_id],
          })
          reproposeNote = `電話確認NG → 取消し、同日の再提案を ${result.adoptedCount} 件採用しました（電話確認キューへ）`
          void writeOperationTrace({
            clinicId: clinic.id,
            userId: user.id,
            action: 'phone.ng_repropose',
            entityType: 'visit',
            entityId: row.visit_id,
            payload: {
              targetDate,
              adoptedCount: result.adoptedCount,
              patientId: row.patient_id,
            },
          })
        } catch (reproposeError) {
          reproposeNote = `電話確認NG → 取消しました。再提案は失敗: ${
            reproposeError instanceof Error
              ? reproposeError.message
              : '不明なエラー'
          }`
        }
      }
      toast.success(reproposeNote)
    } else {
      toast.success(`状態を「${phoneStatusLabel(status)}」に更新しました`)
    }

    setBusy(false)
    setNoteModalOpen(false)
    setNoteTarget(null)
    await loadRows()
  }

  async function handleQuickStatus(row: ContactRow, status: PhoneStatus) {
    if (status === 'ng' || status === 'absent' || status === 'callback_waiting') {
      openNoteModal(row, status)
      return
    }
    await applyStatus(row, status, row.result_note)
  }

  async function submitNoteModal() {
    if (!noteTarget) return
    await applyStatus(noteTarget, noteStatus, noteText.trim() || null)
  }

  const headerActions = (
    <div className="flex flex-nowrap items-end gap-3">
      <NameChartSearchInput
        id="contacts-list-search"
        value={search}
        onChange={setSearch}
      />
      <div className="w-[12rem]">
        <Select
          id="contacts-status-filter"
          label="状態"
          labelTone="muted"
          size="sm"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          options={STATUS_OPTIONS}
        />
      </div>
    </div>
  )

  if (!clinicReady) {
    return (
      <DashboardLayout title="患者管理" fillViewport>
        <article className={CONTACTS_ARTICLE_CLASS}>
          <ClinicAccessPlaceholder />
        </article>
      </DashboardLayout>
    )
  }

  if (!clinic) {
    return (
      <DashboardLayout title="患者管理" fillViewport>
        <article className={CONTACTS_ARTICLE_CLASS}>
          <p className="text-sm text-slate-500">クリニックを選択または作成してください。</p>
        </article>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="患者管理" fillViewport actions={headerActions}>
      <article className={CONTACTS_ARTICLE_CLASS}>
        <div className="flex shrink-0 items-end">
          <ContactsSummaryBar
            visibleCount={filtered.length}
            openCount={openCount}
            pendingCount={pendingCount}
            loading={loading}
          />
        </div>

        <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-auto rounded-2xl border border-slate-200 bg-white">
          {loading ? (
            <div className="flex min-h-[8rem] flex-1 items-center justify-center">
              <p className="text-sm text-slate-400">電話確認一覧を読み込んでいます…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex min-h-[8rem] flex-1 items-center justify-center px-4">
              <p className="text-center text-sm text-slate-400">
                該当する電話確認はありません。自動提案で採用するか、フィルタ・検索を変更してください。
              </p>
            </div>
          ) : (
            <ContactsTable
              rows={filtered}
              selectedIds={selectedIds}
              busy={busy}
              canWrite={canWriteOperations}
              actionStatuses={ACTION_STATUSES}
              onQuickStatus={(row, status) => {
                void handleQuickStatus(row, status)
              }}
              onToggleOne={(id) => {
                setSelectedIds((prev) => {
                  const next = new Set(prev)
                  if (next.has(id)) next.delete(id)
                  else next.add(id)
                  return next
                })
              }}
              onToggleAll={() => {
                setSelectedIds((prev) => {
                  if (filtered.every((row) => prev.has(row.id))) return new Set()
                  return new Set(filtered.map((row) => row.id))
                })
              }}
            />
          )}
        </div>
      </article>

      <Modal
        isOpen={noteModalOpen}
        title="電話結果のメモ"
        onClose={() => {
          if (busy) return
          setNoteModalOpen(false)
          setNoteTarget(null)
        }}
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => {
                setNoteModalOpen(false)
                setNoteTarget(null)
              }}
            >
              キャンセル
            </Button>
            <Button loading={busy} onClick={() => void submitNoteModal()}>
              {phoneStatusLabel(noteStatus)} として保存
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {noteTarget?.patients?.name_kanji ?? '患者'} の結果を「
            {phoneStatusLabel(noteStatus)}」にします。
            {noteStatus === 'ng'
              ? ' 訪問は取消し、同日の再提案を試みます。'
              : null}
          </p>
          <Input
            label="メモ（任意）"
            value={noteText}
            onChange={(event) => setNoteText(event.target.value)}
            placeholder="折り返し希望時間、NG理由など"
          />
        </div>
      </Modal>
    </DashboardLayout>
  )
}
