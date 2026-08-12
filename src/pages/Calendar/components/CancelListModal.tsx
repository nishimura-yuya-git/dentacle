import { useCallback, useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase'
import { CancelUserIcon } from '@/pages/Calendar/components/CancelUserIcon'
import { IconHoverTooltip } from '@/pages/Calendar/components/IconHoverTooltip'
import { useAnchoredPopover } from '@/pages/Calendar/hooks/useAnchoredPopover'
import { formatTime } from '@/utils/dates'

type CancelListRow = {
  id: string
  patient_id: string
  scheduled_date: string
  start_time: string
  end_time: string
  cancelled_at: string | null
  patients: {
    name_kanji: string
    chart_number: string | null
  } | null
  staff_members: { display_name: string } | null
  teams: { name: string } | null
}

type Props = {
  clinicId: string
  date: string
  cancelledCount: number
}

function durationLabel(start: string, end: string): string {
  const [sh, sm] = start.slice(0, 5).split(':').map(Number)
  const [eh, em] = end.slice(0, 5).split(':').map(Number)
  const minutes = eh * 60 + em - (sh * 60 + sm)
  if (!Number.isFinite(minutes) || minutes <= 0) return '—'
  return `${minutes}分`
}

function formatTitleDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${y}年${m}月${d}日`
}

function formatCancelDate(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}

const PANEL_WIDTH = 720

/** キャンセルリスト（禁止アイコン → 近傍ポップオーバー） */
export function CancelListModal({ clinicId, date, cancelledCount }: Props) {
  const toast = useToast()
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<CancelListRow[]>([])
  const [cancelCounts, setCancelCounts] = useState<Record<string, number>>({})
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
      .from('visits')
      .select(
        `
        id, patient_id, scheduled_date, start_time, end_time, cancelled_at,
        patients(name_kanji, chart_number),
        staff_members(display_name),
        teams(name)
      `,
      )
      .eq('clinic_id', clinicId)
      .eq('scheduled_date', date)
      .eq('status', 'cancelled')
      .is('deleted_at', null)
      .order('start_time', { ascending: true })
      .limit(200)

    if (error) {
      setLoading(false)
      toast.error(error.message)
      setRows([])
      setCancelCounts({})
      return
    }

    const list = (data ?? []) as CancelListRow[]
    setRows(list)

    const patientIds = [...new Set(list.map((row) => row.patient_id))]
    if (patientIds.length === 0) {
      setCancelCounts({})
      setLoading(false)
      return
    }

    const { data: countRows, error: countError } = await supabase
      .from('visits')
      .select('patient_id')
      .eq('clinic_id', clinicId)
      .eq('status', 'cancelled')
      .is('deleted_at', null)
      .in('patient_id', patientIds)

    setLoading(false)
    if (countError) {
      toast.error(countError.message)
      setCancelCounts({})
      return
    }

    const next: Record<string, number> = {}
    for (const row of countRows ?? []) {
      const id = row.patient_id as string
      next[id] = (next[id] ?? 0) + 1
    }
    setCancelCounts(next)
  }, [clinicId, date, toast])

  useEffect(() => {
    if (!open) return
    void load()
  }, [open, load])

  const tipLabel =
    cancelledCount > 0
      ? `キャンセルリスト（${cancelledCount}件）`
      : 'キャンセルリスト'

  return (
    <>
      <IconHoverTooltip
        ref={buttonRef}
        label={tipLabel}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((prev) => !prev)}
      >
        {cancelledCount > 0 ? (
          <span className="absolute -left-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black leading-none text-white shadow-sm">
            {cancelledCount > 99 ? '99+' : cancelledCount}
          </span>
        ) : null}
        <CancelUserIcon />
      </IconHoverTooltip>

      {open
        ? createPortal(
            <div
              ref={panelRef}
              id={panelId}
              role="dialog"
              aria-modal="true"
              aria-label="キャンセルリスト"
              style={{ top: pos.top, left: pos.left }}
              className="fixed z-[60] flex max-h-[min(28rem,calc(100vh-5rem))] w-[min(45rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    キャンセルリスト（{formatTitleDate(date)}）
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
                    この日のキャンセルはありません。
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-[720px] w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="bg-emerald-50 text-[11px] font-bold text-slate-700">
                          <th className="border-b border-slate-200 px-3 py-2.5">
                            予約時間
                          </th>
                          <th className="border-b border-slate-200 px-3 py-2.5">
                            キャンセル日（回数）
                          </th>
                          <th className="border-b border-slate-200 px-3 py-2.5">
                            患者名
                          </th>
                          <th className="border-b border-slate-200 px-3 py-2.5">
                            担当
                          </th>
                          <th className="border-b border-slate-200 px-3 py-2.5">
                            ユニット
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => {
                          const count = cancelCounts[row.patient_id]
                          const countLabel =
                            typeof count === 'number' ? ` (${count}回)` : ''
                          return (
                            <tr
                              key={row.id}
                              className="border-b border-slate-100 bg-white"
                            >
                              <td className="px-3 py-2.5 align-top font-medium text-slate-800 tabular-nums">
                                {formatTime(row.start_time)} [
                                {durationLabel(row.start_time, row.end_time)}]
                              </td>
                              <td className="px-3 py-2.5 align-top text-slate-700 tabular-nums">
                                {formatCancelDate(row.cancelled_at)}
                                {countLabel}
                              </td>
                              <td className="px-3 py-2.5 align-top">
                                <Link
                                  to={`/patients/${row.patient_id}`}
                                  className="font-bold text-[#008C01] underline-offset-2 hover:underline"
                                  onClick={close}
                                >
                                  {row.patients?.name_kanji ?? '患者不明'}
                                </Link>
                                <span className="ml-1 text-slate-500">
                                  [{row.patients?.chart_number || '—'}]
                                </span>
                              </td>
                              <td className="px-3 py-2.5 align-top text-slate-700">
                                {row.staff_members?.display_name ?? '—'}
                              </td>
                              <td className="px-3 py-2.5 align-top text-slate-700">
                                {row.teams?.name ?? '—'}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex justify-end border-t border-slate-100 px-4 py-3">
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
