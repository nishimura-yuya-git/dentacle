import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { TimePicker } from '@/components/ui/TimePicker'
import { VisitBriefingSection } from '@/pages/Calendar/components/VisitBriefingSection'
import { VisitCancelConfirm } from '@/pages/Calendar/components/VisitCancelConfirm'
import { VisitCellColorField } from '@/pages/Calendar/components/VisitCellColorField'
import { VisitMenuFields } from '@/pages/Calendar/components/VisitMenuFields'
import { VisitReservationTable } from '@/pages/Calendar/components/VisitReservationTable'
import { usePatientVisitReservations } from '@/pages/Calendar/hooks/usePatientVisitReservations'
import { useVisitBriefing } from '@/pages/Calendar/hooks/useVisitBriefing'
import {
  formatBriefingText,
  formatConstraintLine,
  formatPreferredHopeParts,
  formatPreviousVisitLabel,
} from '@/pages/Calendar/utils/visitBriefing'
import { canConfirmTentativeFromDetail } from '@/pages/Calendar/utils/visitClickAction'
import {
  pickPreviousReservation,
  type PatientVisitReservation,
} from '@/pages/Calendar/utils/visitReservationRows'
import type { VisitCellColor } from '@/utils/visitMenus/visitCellColor'
import {
  VISIT_MENU_CATALOG,
  type VisitMenuItem,
} from '@/utils/visitMenus/visitMenuCatalog'
import { applyMenu1EndTime, type VisitMenuForm } from '@/utils/visitMenus/visitMenuState'

type Option = { value: string; label: string }

type Props = {
  open: boolean
  busy: boolean
  clinicId?: string
  patientId?: string
  currentVisitId: string
  currentReservation: PatientVisitReservation | null
  patientName: string
  staffId: string
  teamId: string
  startTime: string
  endTime: string
  menus: VisitMenuForm
  cellColor: VisitCellColor
  menuEnabled: Record<string, boolean>
  menuCatalog?: readonly VisitMenuItem[]
  teamOptions: Option[]
  staffOptions: Option[]
  onClose: () => void
  onChangeStaff: (value: string) => void
  onChangeTeam: (value: string) => void
  onChangeStart: (value: string) => void
  onChangeEnd: (value: string) => void
  onChangeMenus: (next: VisitMenuForm) => void
  onChangeCellColor: (next: VisitCellColor) => void
  onSubmit: (event: FormEvent) => void
  onConfirmTentative: () => void
  onCancelReservation: (visitId: string) => Promise<boolean>
  onCopyNext: () => void
}

export function VisitDetailModal({
  open,
  busy,
  clinicId,
  patientId,
  currentVisitId,
  currentReservation,
  patientName,
  staffId,
  teamId,
  startTime,
  endTime,
  menus,
  cellColor,
  menuEnabled,
  menuCatalog = VISIT_MENU_CATALOG,
  teamOptions,
  staffOptions,
  onClose,
  onChangeStaff,
  onChangeTeam,
  onChangeStart,
  onChangeEnd,
  onChangeMenus,
  onChangeCellColor,
  onSubmit,
  onConfirmTentative,
  onCancelReservation,
  onCopyNext,
}: Props) {
  const [cancelVisitId, setCancelVisitId] = useState<string | null>(null)
  useEffect(() => {
    if (!open) setCancelVisitId(null)
  }, [open])
  const status = currentReservation?.status ?? ''
  const canConfirm = canConfirmTentativeFromDetail(status)
  const reservations = usePatientVisitReservations({
    clinicId,
    patientId,
    open,
    current: currentReservation,
  })
  const briefing = useVisitBriefing({ clinicId, patientId, open })
  const previousLabel = useMemo(() => {
    const previous = currentReservation
      ? pickPreviousReservation(reservations.rows, currentReservation)
      : null
    return formatPreviousVisitLabel(previous, briefing.lastVisitDate)
  }, [briefing.lastVisitDate, currentReservation, reservations.rows])
  const preferredHope = useMemo(
    () =>
      formatPreferredHopeParts(
        briefing.preferredWeekdays,
        briefing.constraints,
        briefing.preferredTimeStart,
        briefing.preferredTimeEnd,
      ),
    [
      briefing.constraints,
      briefing.preferredTimeEnd,
      briefing.preferredTimeStart,
      briefing.preferredWeekdays,
    ],
  )

  const requestCancel = (visitId: string) => {
    setCancelVisitId(visitId)
  }

  const runCancel = () => {
    if (!cancelVisitId) return
    void onCancelReservation(cancelVisitId).then((ok) => {
      if (!ok) return
      const closedCurrent = cancelVisitId === currentVisitId
      setCancelVisitId(null)
      if (closedCurrent) {
        onClose()
        return
      }
      void reservations.reload()
    })
  }

  return (
    <Modal
      isOpen={open}
      title={canConfirm ? '仮予約の確認' : '訪問の詳細'}
      size="lg"
      onClose={onClose}
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="secondary" disabled={busy} onClick={onCopyNext}>
            連続で複製
          </Button>
          <Button variant="secondary" onClick={onClose}>
            閉じる
          </Button>
          <Button
            type="submit"
            form="move-visit-form"
            variant={canConfirm ? 'secondary' : 'primary'}
            loading={busy && !canConfirm}
            disabled={busy}
          >
            予約を変更する
          </Button>
          {canConfirm ? (
            <Button disabled={busy} loading={busy} onClick={onConfirmTentative}>
              本予約に確定する
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="space-y-6">
        <VisitCancelConfirm
          open={cancelVisitId != null}
          busy={busy}
          onClose={() => setCancelVisitId(null)}
          onConfirm={runCancel}
        />
        <VisitBriefingSection
          loading={briefing.loading}
          status={status}
          staffId={staffId}
          staffOptions={staffOptions}
          address={formatBriefingText(briefing.address, '住所未登録')}
          phone={formatBriefingText(briefing.phone, '電話未登録')}
          previousLabel={previousLabel}
          weekdayLabel={preferredHope.weekdayLabel}
          timeRangeLabel={preferredHope.timeRangeLabel}
          constraintLines={briefing.constraints
            .filter((row) => row.constraint_type !== 'available')
            .map(formatConstraintLine)}
          hasInfectiousDisease={briefing.hasInfectiousDisease}
          onChangeStaff={onChangeStaff}
        />

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">この患者の予約</h3>
              <p className="mt-1 text-sm font-medium text-slate-600">{patientName}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="text-rose-600"
              disabled={busy}
              onClick={() => requestCancel(currentVisitId)}
            >
              予約キャンセル
            </Button>
          </div>
          <VisitReservationTable
            rows={reservations.rows}
            loading={reservations.loading}
            currentVisitId={currentVisitId}
            busy={busy}
            onCancel={requestCancel}
          />
        </section>

        <form id="move-visit-form" onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
          <h3 className="text-sm font-bold text-slate-900 md:col-span-2">この予約を変更</h3>
          <div className="md:col-span-2">
            <Select
              label="訪問号車"
              value={teamId}
              onChange={(e) => onChangeTeam(e.target.value)}
              options={teamOptions}
            />
          </div>
          <TimePicker
            label="開始時刻"
            value={startTime}
            onChange={(next) => {
              onChangeStart(next)
              if (!menus.menu_1) return
              const applied = applyMenu1EndTime(
                { start_time: next, end_time: endTime, menu_1: menus.menu_1 },
                menus.menu_1,
                menuCatalog,
              )
              onChangeEnd(applied.end_time)
            }}
            required
            minuteStep={5}
          />
          <TimePicker
            label="終了時刻"
            value={endTime}
            onChange={onChangeEnd}
            required
            minuteStep={5}
          />
          <div className="md:col-span-2">
            <VisitMenuFields
              value={menus}
              enabled={menuEnabled}
              catalog={menuCatalog}
              onChange={(next) => {
                onChangeMenus(next)
                if (next.menu_1 === menus.menu_1) return
                const applied = applyMenu1EndTime(
                  { start_time: startTime, end_time: endTime, menu_1: next.menu_1 },
                  next.menu_1,
                  menuCatalog,
                )
                onChangeEnd(applied.end_time)
              }}
            />
          </div>
          <div className="md:col-span-2">
            <VisitCellColorField value={cellColor} onChange={onChangeCellColor} />
          </div>
          <p className="text-xs font-medium text-slate-400 md:col-span-2">
            {canConfirm
              ? '内容を確認してから「本予約に確定する」を押します。号車・時刻・担当の保存は「予約を変更する」です。'
              : '号車・時刻・メニュー・担当を直して「予約を変更する」で保存します。'}
          </p>
        </form>
      </div>
    </Modal>
  )
}
