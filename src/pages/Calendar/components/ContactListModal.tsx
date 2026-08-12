import { useCallback, useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase'
import { IconHoverTooltip } from '@/pages/Calendar/components/IconHoverTooltip'
import { PhoneIcon } from '@/pages/Calendar/components/PhoneIcon'
import { useAnchoredPopover } from '@/pages/Calendar/hooks/useAnchoredPopover'
import { formatJapaneseDate } from '@/pages/Calendar/utils/calendarGrid'
import { formatTime } from '@/utils/dates'
import { phoneStatusLabel, visitStatusLabel } from '@/utils/roleLabels'

type ContactListRow = {
  id: string
  status: string
  result_note: string | null
  created_at: string
  visit_id: string
  patient_id: string
  visits: {
    scheduled_date: string
    start_time: string
    end_time: string
    status: string
    staff_id: string | null
    staff_members: { display_name: string } | null
  } | null
  patients: {
    name_kanji: string
    chart_number: string | null
    phone: string | null
  } | null
}

type Props = {
  clinicId: string
  date: string
}

function durationLabel(start: string | undefined, end: string | undefined): string {
  if (!start || !end) return '—'
  const [sh, sm] = start.slice(0, 5).split(':').map(Number)
  const [eh, em] = end.slice(0, 5).split(':').map(Number)
  const minutes = eh * 60 + em - (sh * 60 + sm)
  if (!Number.isFinite(minutes) || minutes <= 0) return '—'
  return `${minutes}分`
}

function formatRegisteredAt(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  const weekday = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()]
  return `${y}/${m}/${d} ${hh}:${mm} (${weekday})`
}

function visitStatusShort(status: string): string {
  if (status === 'tentative') return '[仮]'
  if (status === 'confirmed') return '[本]'
  return `[${visitStatusLabel(status)}]`
}

const PANEL_WIDTH = 720

/** 連絡者リスト（電話アイコン → 近傍ポップオーバー） */
export function ContactListModal({ clinicId, date }: Props) {
  const toast = useToast()
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<ContactListRow[]>([])
  const [loading, setLoading] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const { buttonRef, panelRef, pos } = useAnchoredPopover({
    open,
    onClose: close,
    panelWidth: PANEL_WIDTH,
  })

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('visit_phone_confirmations')
      .select(
        `
        id, status, result_note, created_at, visit_id, patient_id,
        visits!inner(
          scheduled_date, start_time, end_time, status, staff_id,
          staff_members(display_name)
        ),
        patients(name_kanji, chart_number, phone)
      `,
      )
      .eq('clinic_id', clinicId)
      .is('deleted_at', null)
      .eq('visits.scheduled_date', date)
      .order('created_at', { ascending: true })
      .limit(200)

    setLoading(false)
    if (error) {
      toast.error(error.message)
      setRows([])
      return
    }

    const filtered = ((data ?? []) as ContactListRow[]).filter(
      (row) => row.visits?.scheduled_date === date,
    )
    setRows(filtered)
  }, [clinicId, date, toast])

  useEffect(() => {
    if (!open) return
    void load()
  }, [open, load])

  return (
    <>
      <IconHoverTooltip
        ref={buttonRef}
        label="連絡者リスト"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((prev) => !prev)}
      >
        <PhoneIcon />
      </IconHoverTooltip>

      {open
        ? createPortal(
            <div
              ref={panelRef}
              id={panelId}
              role="dialog"
              aria-modal="true"
              aria-label="連絡者リスト"
              style={{ top: pos.top, left: pos.left }}
              className="fixed z-[60] flex max-h-[min(28rem,calc(100vh-5rem))] w-[min(45rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">連絡者リスト</p>
                  <p className="mt-0.5 text-xs font-medium text-slate-500">
                    {formatJapaneseDate(date)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  className="!px-2 !py-1 !text-xs"
                  onClick={close}
                >
                  閉じる
                </Button>
              </div>

              <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
                {loading ? (
                  <p className="text-sm text-slate-400">読み込み中…</p>
                ) : rows.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    この日の電話確認対象はありません。自動提案の採用や手動仮予約で追加されます。
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-[720px] w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="bg-emerald-50 text-[11px] font-bold text-slate-700">
                          <th className="border-b border-slate-200 px-3 py-2.5">
                            連絡手段 / 電話番号 / 連絡状況
                          </th>
                          <th className="border-b border-slate-200 px-3 py-2.5">
                            ステータス / 種別
                          </th>
                          <th className="border-b border-slate-200 px-3 py-2.5">
                            名前 / 診察券番号
                          </th>
                          <th className="border-b border-slate-200 px-3 py-2.5">
                            診療メニュー / 担当者
                          </th>
                          <th className="border-b border-slate-200 px-3 py-2.5">
                            忘備録
                          </th>
                          <th className="border-b border-slate-200 px-3 py-2.5">
                            登録日時
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => {
                          const visit = row.visits
                          const patient = row.patients
                          const staffName =
                            visit?.staff_members?.display_name ?? '—'
                          return (
                            <tr
                              key={row.id}
                              className="border-b border-slate-100 bg-white"
                            >
                              <td className="px-3 py-2.5 align-top text-slate-700">
                                <p>電話</p>
                                <p className="font-medium tabular-nums">
                                  {patient?.phone || '未登録'}
                                </p>
                                <p className="font-bold text-[#008C01]">
                                  {phoneStatusLabel(row.status)}
                                </p>
                              </td>
                              <td className="px-3 py-2.5 align-top font-medium text-[#008C01]">
                                {visit
                                  ? `${visitStatusShort(visit.status)}${visit.scheduled_date.replace(/-/g, '/')} ${formatTime(visit.start_time)} - ${durationLabel(visit.start_time, visit.end_time)}`
                                  : '—'}
                              </td>
                              <td className="px-3 py-2.5 align-top">
                                <Link
                                  to={`/patients/${row.patient_id}`}
                                  className="font-bold text-[#008C01] underline-offset-2 hover:underline"
                                  onClick={close}
                                >
                                  {patient?.name_kanji ?? '患者不明'}
                                </Link>
                                <p className="mt-0.5 text-slate-500">
                                  {patient?.chart_number || '—'}
                                </p>
                              </td>
                              <td className="px-3 py-2.5 align-top text-slate-700">
                                <p>—</p>
                                <p>{staffName}</p>
                              </td>
                              <td className="px-3 py-2.5 align-top text-slate-700">
                                {row.result_note?.trim() || '—'}
                              </td>
                              <td className="px-3 py-2.5 align-top text-slate-600 tabular-nums">
                                {formatRegisteredAt(row.created_at)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
                <Link
                  to="/contacts"
                  className="text-sm font-bold text-[#008C01] underline-offset-2 hover:underline"
                  onClick={close}
                >
                  全ての連絡者リストを表示
                </Link>
                <Button
                  variant="secondary"
                  className="!px-3 !py-1.5 !text-xs"
                  onClick={close}
                >
                  閉じる
                </Button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
