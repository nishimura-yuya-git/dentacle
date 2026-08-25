import type { PointerEvent as ReactPointerEvent } from 'react'
import { Skeleton } from '@/components/ui/Skeleton'
import type { CalendarBlock, CalendarVisit } from '@/pages/Calendar/components/dayVisitGrid.types'
import {
  INFECTIOUS_DISEASE_LABEL,
  readHasInfectiousDisease,
  visitBlockTextClasses,
} from '@/pages/Patients/infectiousDiseasePolicy'
import {
  GRID_START_MINUTES,
  SLOT_HEIGHT_PX,
  SLOT_MINUTES,
  visitBlockStyle,
} from '@/pages/Calendar/utils/calendarGrid'
import { calendarBlockClassName } from '@/pages/Calendar/utils/calendarBlockAppearance'
import {
  isAutoProposalTentative,
  provisionalBlockHeightPx,
  provisionalStatusLabel,
  visitBlockClassName,
} from '@/pages/Calendar/utils/visitBlockAppearance'
import { formatTime } from '@/utils/dates'
import { visitStatusLabel } from '@/utils/roleLabels'
import { CalendarPeerBadge } from '@/pages/Calendar/components/CalendarPeerBadge'
import {
  focusPeersForVisit,
  remoteGhostsForTeam,
  type CalendarPeerView,
} from '@/pages/Calendar/utils/calendarLivePeers'

const BLOCK_LABEL: Record<string, string> = {
  break: '休憩',
  travel: '移動',
  meeting: '会議',
  other: 'ブロック',
}

const SKELETON_BLOCKS = [
  { start: '09:30', end: '10:15' },
  { start: '11:00', end: '11:45' },
  { start: '14:00', end: '14:30' },
] as const

type PreviewRange = { startTime: string; endTime: string }

type Props = {
  teamId: string
  loading: boolean
  timeSlots: number[]
  visits: CalendarVisit[]
  blocks: CalendarBlock[]
  createPreview: PreviewRange | null
  movingPreview: PreviewRange | null
  resizeVisitId: string | null
  resizeStart: string | null
  resizeEnd: string | null
  hideVisitId: string | null
  remoteHideVisitIds?: string[]
  livePeers?: CalendarPeerView[]
  canResize: boolean
  onVisitPointerDown: (
    visit: CalendarVisit,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void
  onResizePointerDown: (
    visit: CalendarVisit,
    event: ReactPointerEvent<HTMLSpanElement>,
  ) => void
  onSelectBlock?: (block: CalendarBlock) => void
}

export function DayVisitColumnBody({
  teamId,
  loading,
  timeSlots,
  visits,
  blocks,
  createPreview,
  movingPreview,
  resizeVisitId,
  resizeStart,
  resizeEnd,
  hideVisitId,
  remoteHideVisitIds = [],
  livePeers = [],
  canResize,
  onVisitPointerDown,
  onResizePointerDown,
  onSelectBlock,
}: Props) {
  return (
    <>
      {timeSlots.map((slot) => (
        <div
          key={`${teamId}-${slot}`}
          className="pointer-events-none absolute left-0 right-0 border-t border-slate-100"
          style={{
            top: ((slot - GRID_START_MINUTES) / SLOT_MINUTES) * SLOT_HEIGHT_PX,
            height: SLOT_HEIGHT_PX,
          }}
        />
      ))}

      {createPreview ? (
        <div
          className="pointer-events-none absolute left-1 right-1 z-[2] overflow-hidden rounded-md border border-[#008C01]/40 bg-[#008C01]/15 px-1.5 py-1"
          style={visitBlockStyle(createPreview.startTime, createPreview.endTime)}
          aria-hidden
        >
          <p className="truncate text-[10px] font-bold text-[#008C01]">
            {createPreview.startTime}-{createPreview.endTime}
          </p>
        </div>
      ) : null}

      {movingPreview ? (
        <div
          className="pointer-events-none absolute left-1 right-1 z-[4] overflow-hidden rounded-md border border-[#008C01] bg-[#008C01]/20 px-1.5 py-1"
          style={visitBlockStyle(movingPreview.startTime, movingPreview.endTime)}
          aria-hidden
        >
          <p className="truncate text-[10px] font-bold text-[#008C01]">移動中</p>
        </div>
      ) : null}

      {remoteGhostsForTeam(livePeers, teamId, {
        occupyingVisits: visits,
        ignoreVisitIds: hideVisitId ? [hideVisitId] : [],
      }).map((ghost) => (
        <div
          key={`live-${ghost.peerId}`}
          className="pointer-events-none absolute left-1 right-1 z-[3] overflow-visible rounded-md border border-dashed border-slate-400 bg-slate-100/80 px-1.5 py-1"
          style={visitBlockStyle(ghost.startTime, ghost.endTime)}
          aria-hidden
        >
          <div className="absolute -right-1 -top-1">
            <CalendarPeerBadge pcLabel={ghost.pcLabel} size="sm" />
          </div>
          <p className="truncate text-[10px] font-bold text-slate-600">
            {ghost.mode === 'create' ? '入力中' : '操作中'}
          </p>
        </div>
      ))}

      {loading
        ? SKELETON_BLOCKS.map((block, index) => {
            const { top, height } = visitBlockStyle(block.start, block.end)
            return (
              <div
                key={`${teamId}-sk-${index}`}
                className="absolute left-1 right-1 z-[1] overflow-hidden rounded-md border border-slate-100 bg-slate-50/80 px-1.5 py-1"
                style={{ top, height }}
              >
                <Skeleton variant="text" width="40%" height={8} className="mb-1" />
                <Skeleton variant="text" width="70%" height={10} className="mb-1" />
                <Skeleton variant="text" width="35%" height={8} />
              </div>
            )
          })
        : null}

      {!loading
        ? blocks.map((block) => {
            const { top, height } = visitBlockStyle(block.start_time, block.end_time)
            return (
              <button
                key={block.id}
                type="button"
                data-calendar-block="true"
                onClick={(event) => {
                  event.stopPropagation()
                  onSelectBlock?.(block)
                }}
                className={calendarBlockClassName()}
                style={{ top, height }}
              >
                <p className="truncate text-[10px] font-bold text-slate-500">
                  {formatTime(block.start_time)}-{formatTime(block.end_time)}
                </p>
                <p className="truncate text-xs font-bold text-slate-700">
                  {block.title || BLOCK_LABEL[block.block_type] || 'ブロック'}
                </p>
              </button>
            )
          })
        : null}

      {!loading
        ? visits.map((visit) => {
            if (hideVisitId === visit.id) return null
            if (remoteHideVisitIds.includes(visit.id)) return null
            const displayStart =
              resizeVisitId === visit.id && resizeStart
                ? resizeStart
                : visit.start_time
            const displayEnd =
              resizeVisitId === visit.id && resizeEnd ? resizeEnd : visit.end_time
            const { top, height } = visitBlockStyle(displayStart, displayEnd)
            const provisionalAuto = isAutoProposalTentative(visit)
            const blockHeight = provisionalAuto
              ? provisionalBlockHeightPx(height)
              : height
            const statusText = provisionalAuto
              ? provisionalStatusLabel(blockHeight)
              : visitStatusLabel(visit.status)
            const watching = focusPeersForVisit(livePeers, visit.id)
            const infectious = readHasInfectiousDisease(
              visit.patients?.has_infectious_disease,
            )
            const text = visitBlockTextClasses(infectious)
            const patientName = visit.patients?.name_kanji ?? '患者不明'
            return (
              <div key={visit.id}>
              <button
                type="button"
                data-visit-block="true"
                title={
                  infectious
                    ? `${INFECTIOUS_DISEASE_LABEL}。器具・接触に注意`
                    : provisionalAuto
                      ? 'クリックで詳細を開く'
                      : undefined
                }
                aria-label={
                  infectious
                    ? `${patientName}（${INFECTIOUS_DISEASE_LABEL}）`
                    : provisionalAuto
                      ? `${visit.patients?.name_kanji ?? '患者'}の仮予約。クリックで詳細を開く`
                      : undefined
                }
                onPointerDown={(event) => onVisitPointerDown(visit, event)}
                className={visitBlockClassName(visit)}
                style={{ top, height: blockHeight }}
              >
                <p className={text.time}>
                  {formatTime(displayStart)}-{formatTime(displayEnd)}
                </p>
                <p className={text.name}>{patientName}</p>
                <p
                  className={[
                    text.status,
                    infectious
                      ? ''
                      : provisionalAuto
                        ? 'text-[#008C01]'
                        : 'font-medium text-slate-500',
                  ].join(' ')}
                >
                  {infectious ? `${INFECTIOUS_DISEASE_LABEL} · ${statusText}` : statusText}
                </p>
                {canResize && !provisionalAuto ? (
                  <span
                    data-resize-handle="true"
                    onPointerDown={(event) => onResizePointerDown(visit, event)}
                    className="absolute inset-x-1 bottom-0 h-2 cursor-ns-resize rounded-b-md bg-transparent"
                    aria-hidden
                  />
                ) : null}
              </button>
                {watching.length > 0 ? (
                  <span
                    className="pointer-events-none absolute z-[5] flex -space-x-1"
                    style={{ top: Math.max(0, top - 8), right: 2 }}
                  >
                    {watching.map((item) => (
                      <CalendarPeerBadge
                        key={item.peerId}
                        pcLabel={item.pcLabel}
                        size="sm"
                      />
                    ))}
                  </span>
                ) : null}
              </div>
            )
          })
        : null}
    </>
  )
}
