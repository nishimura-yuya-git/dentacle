import {
  EMPTY_VISIT_CREATE_FORM,
  VisitCreateModal,
  type VisitCreateForm,
} from '@/pages/Calendar/components/VisitCreateModal'
import { VisitDetailModal } from '@/pages/Calendar/components/VisitDetailModal'
import type { VisitRow } from '@/pages/Calendar/hooks/useCalendarDayData'
import {
  asSubmit,
  cancelVisit,
  confirmTentativeVisit,
  createVisitOrBlock,
  duplicateVisitAfter,
  updateVisitDetail,
  type VisitActionCtx,
} from '@/pages/Calendar/hooks/useCalendarVisitActions'
import { toPatientVisitReservation } from '@/pages/Calendar/utils/visitReservationRows'
import type { VisitCellColor } from '@/utils/visitMenus/visitCellColor'
import type { VisitMenuItem } from '@/utils/visitMenus/visitMenuCatalog'
import type { VisitMenuForm } from '@/utils/visitMenus/visitMenuState'

type Option = { value: string; label: string }

type Props = {
  createOpen: boolean
  createForm: VisitCreateForm
  detailOpen: boolean
  busy: boolean
  date: string
  patientName: string
  selectedVisit: VisitRow | null
  staffId: string
  teamId: string
  startTime: string
  endTime: string
  menus: VisitMenuForm
  cellColor: VisitCellColor
  menuEnabled: Record<string, boolean>
  menuCatalog: readonly VisitMenuItem[]
  patientOptions: Option[]
  teamOptions: Option[]
  staffOptions: Option[]
  actionCtx: VisitActionCtx | null
  onCloseCreate: () => void
  onChangeCreate: (next: VisitCreateForm) => void
  onCloseDetail: () => void
  onChangeStaff: (value: string) => void
  onChangeTeam: (value: string) => void
  onChangeStart: (value: string) => void
  onChangeEnd: (value: string) => void
  onChangeMenus: (next: VisitMenuForm) => void
  onChangeCellColor: (next: VisitCellColor) => void
}

export function CalendarVisitModals({
  createOpen,
  createForm,
  detailOpen,
  busy,
  date,
  patientName,
  selectedVisit,
  staffId,
  teamId,
  startTime,
  endTime,
  menus,
  cellColor,
  menuEnabled,
  menuCatalog,
  patientOptions,
  teamOptions,
  staffOptions,
  actionCtx,
  onCloseCreate,
  onChangeCreate,
  onCloseDetail,
  onChangeStaff,
  onChangeTeam,
  onChangeStart,
  onChangeEnd,
  onChangeMenus,
  onChangeCellColor,
}: Props) {
  return (
    <>
      <VisitCreateModal
        open={createOpen}
        busy={busy}
        date={date}
        form={createForm}
        patientOptions={patientOptions}
        teamOptions={teamOptions}
        staffOptions={staffOptions}
        menuEnabled={menuEnabled}
        menuCatalog={menuCatalog}
        onClose={onCloseCreate}
        onChange={onChangeCreate}
        onSubmit={asSubmit(async () => {
          if (!actionCtx) return
          const ok = await createVisitOrBlock(actionCtx, createForm, {
            start: EMPTY_VISIT_CREATE_FORM.start_time,
            end: EMPTY_VISIT_CREATE_FORM.end_time,
          })
          if (ok) onCloseCreate()
        })}
      />

      <VisitDetailModal
        open={detailOpen}
        busy={busy}
        clinicId={actionCtx?.clinicId}
        patientId={selectedVisit?.patient_id}
        currentVisitId={selectedVisit?.id ?? ''}
        currentReservation={
          selectedVisit
            ? toPatientVisitReservation({
                id: selectedVisit.id,
                scheduled_date: date,
                start_time: selectedVisit.start_time,
                end_time: selectedVisit.end_time,
                status: selectedVisit.status,
                metadata: selectedVisit.metadata,
                staff_members: {
                  display_name: selectedVisit.staff_id
                    ? staffOptions.find((option) => option.value === selectedVisit.staff_id)
                        ?.label ?? '—'
                    : '—',
                },
              })
            : null
        }
        patientName={patientName}
        staffId={staffId}
        teamId={teamId}
        startTime={startTime}
        endTime={endTime}
        menus={menus}
        cellColor={cellColor}
        menuEnabled={menuEnabled}
        menuCatalog={menuCatalog}
        teamOptions={teamOptions}
        staffOptions={staffOptions}
        onClose={onCloseDetail}
        onChangeStaff={onChangeStaff}
        onChangeTeam={onChangeTeam}
        onChangeStart={onChangeStart}
        onChangeEnd={onChangeEnd}
        onChangeMenus={onChangeMenus}
        onChangeCellColor={onChangeCellColor}
        onSubmit={asSubmit(async () => {
          if (!actionCtx || !selectedVisit) return
          const ok = await updateVisitDetail(actionCtx, selectedVisit.id, {
            teamId,
            startTime,
            endTime,
            menus,
            cellColor,
            staffId,
            currentMetadata: selectedVisit.metadata,
          })
          if (ok) onCloseDetail()
        })}
        onConfirmTentative={() => {
          if (!actionCtx || !selectedVisit) return
          void (async () => {
            const saved = await updateVisitDetail(actionCtx, selectedVisit.id, {
              teamId,
              startTime,
              endTime,
              menus,
              cellColor,
              staffId,
              currentMetadata: selectedVisit.metadata,
            })
            if (!saved) return
            const ok = await confirmTentativeVisit(actionCtx, selectedVisit.id)
            if (ok) onCloseDetail()
          })()
        }}
        onCancelReservation={async (visitId) => {
          if (!actionCtx) return false
          return cancelVisit(actionCtx, visitId)
        }}
        onCopyNext={() => {
          if (!actionCtx || !selectedVisit) return
          void duplicateVisitAfter(actionCtx, selectedVisit, {
            teamId,
            startTime,
            endTime,
          }).then((ok) => {
            if (ok) onCloseDetail()
          })
        }}
      />
    </>
  )
}
