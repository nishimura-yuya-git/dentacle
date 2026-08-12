import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  resizeRangeEnd,
  shiftRangeKeepingDuration,
} from '@/features/calendar/visitTimeMath'
import { DayVisitColumnBody } from '@/pages/Calendar/components/DayVisitColumnBody'
import type {
  CalendarBlock,
  CalendarVisit,
} from '@/pages/Calendar/components/dayVisitGrid.types'
import {
  COLUMN_WIDTH_PX,
  GRID_START_MINUTES,
  SLOT_HEIGHT_PX,
  SLOT_MINUTES,
  TIME_GUTTER_PX,
  buildTimeSlots,
  gridBodyHeightPx,
  minutesToLabel,
} from '@/pages/Calendar/utils/calendarGrid'
import {
  resolveCreateTimeRange,
  resolveDragTimeRange,
  yOffsetToSlotStart,
} from '@/pages/Calendar/utils/gridTimeDrag'
import { resolveNowLineTopPx } from '@/pages/Calendar/utils/nowLine'
import type { VehicleTeam } from '@/pages/Calendar/utils/ensureVehicleTeams'

export type { CalendarBlock, CalendarVisit }

type Props = {
  viewDate: string
  teams: VehicleTeam[]
  visits: CalendarVisit[]
  blocks?: CalendarBlock[]
  loading?: boolean
  onSelectVisit: (visit: CalendarVisit) => void
  onSelectBlock?: (block: CalendarBlock) => void
  onEmptySlotSelect: (teamId: string, startTime: string, endTime: string) => void
  onMoveVisit?: (
    visitId: string,
    teamId: string,
    startTime: string,
    endTime: string,
  ) => void
  onResizeVisit?: (visitId: string, startTime: string, endTime: string) => void
}

type CreateDrag = {
  mode: 'create'
  teamId: string
  anchorSlot: number
  currentSlot: number
}

type MoveDrag = {
  mode: 'move'
  visitId: string
  teamId: string
  startTime: string
  endTime: string
  originTeamId: string
  moved: boolean
}

type ResizeDrag = {
  mode: 'resize'
  visitId: string
  teamId: string
  startTime: string
  endTime: string
}

type DragState = CreateDrag | MoveDrag | ResizeDrag

const TIME_SLOTS = buildTimeSlots()
const BODY_HEIGHT = gridBodyHeightPx()
const MOVE_THRESHOLD_PX = 6

export function DayVisitGrid({
  viewDate,
  teams,
  visits,
  blocks = [],
  loading = false,
  onSelectVisit,
  onSelectBlock,
  onEmptySlotSelect,
  onMoveVisit,
  onResizeVisit,
}: Props) {
  const [drag, setDrag] = useState<DragState | null>(null)
  const [nowLineTop, setNowLineTop] = useState<number | null>(() =>
    resolveNowLineTopPx(viewDate),
  )
  const dragRef = useRef<DragState | null>(null)
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const pointerStartY = useRef(0)

  useEffect(() => {
    const tick = () => setNowLineTop(resolveNowLineTopPx(viewDate))
    tick()
    const id = window.setInterval(tick, 30_000)
    return () => window.clearInterval(id)
  }, [viewDate])

  const setDragBoth = useCallback((next: DragState | null) => {
    dragRef.current = next
    setDrag(next)
  }, [])

  const slotFromPointer = useCallback((teamId: string, clientY: number): number | null => {
    const el = columnRefs.current[teamId]
    if (!el) return null
    const rect = el.getBoundingClientRect()
    return yOffsetToSlotStart(clientY - rect.top)
  }, [])

  const teamIdFromClientX = useCallback(
    (clientX: number): string | null => {
      for (const team of teams) {
        const el = columnRefs.current[team.id]
        if (!el) continue
        const rect = el.getBoundingClientRect()
        if (clientX >= rect.left && clientX <= rect.right) return team.id
      }
      return null
    },
    [teams],
  )

  const finishCreate = useCallback(() => {
    const current = dragRef.current
    if (!current || current.mode !== 'create') return
    const range = resolveCreateTimeRange(current.anchorSlot, current.currentSlot)
    setDragBoth(null)
    onEmptySlotSelect(current.teamId, range.startTime, range.endTime)
  }, [onEmptySlotSelect, setDragBoth])

  const handleColumnPointerDown = (
    teamId: string,
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (loading) return
    if (event.button !== 0) return
    if ((event.target as HTMLElement).closest('[data-visit-block="true"]')) return
    if ((event.target as HTMLElement).closest('[data-calendar-block="true"]')) return
    const slot = slotFromPointer(teamId, event.clientY)
    if (slot == null) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragBoth({ mode: 'create', teamId, anchorSlot: slot, currentSlot: slot })
  }

  const handleVisitPointerDown = (
    visit: CalendarVisit,
    teamId: string,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (loading) return
    if (event.button !== 0) return
    if ((event.target as HTMLElement).closest('[data-resize-handle="true"]')) return
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    pointerStartY.current = event.clientY
    setDragBoth({
      mode: 'move',
      visitId: visit.id,
      teamId,
      startTime: visit.start_time.slice(0, 5),
      endTime: visit.end_time.slice(0, 5),
      originTeamId: teamId,
      moved: false,
    })
  }

  const handleResizePointerDown = (
    visit: CalendarVisit,
    teamId: string,
    event: ReactPointerEvent<HTMLSpanElement>,
  ) => {
    if (loading || !onResizeVisit) return
    if (event.button !== 0) return
    event.stopPropagation()
    event.preventDefault()
    ;(event.currentTarget.parentElement as HTMLElement | null)?.setPointerCapture?.(
      event.pointerId,
    )
    setDragBoth({
      mode: 'resize',
      visitId: visit.id,
      teamId,
      startTime: visit.start_time.slice(0, 5),
      endTime: visit.end_time.slice(0, 5),
    })
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = dragRef.current
    if (!current) return

    if (current.mode === 'create') {
      const slot = slotFromPointer(current.teamId, event.clientY)
      if (slot == null || slot === current.currentSlot) return
      setDragBoth({ ...current, currentSlot: slot })
      return
    }

    if (current.mode === 'move') {
      const nextTeam = teamIdFromClientX(event.clientX) ?? current.teamId
      const slot = slotFromPointer(nextTeam, event.clientY)
      if (slot == null) return
      const moved =
        current.moved || Math.abs(event.clientY - pointerStartY.current) > MOVE_THRESHOLD_PX
      const range = shiftRangeKeepingDuration(current.startTime, current.endTime, slot)
      setDragBoth({
        ...current,
        teamId: nextTeam,
        startTime: range.startTime,
        endTime: range.endTime,
        moved,
      })
      return
    }

    if (current.mode === 'resize') {
      const slot = slotFromPointer(current.teamId, event.clientY)
      if (slot == null) return
      const range = resizeRangeEnd(current.startTime, slot + SLOT_MINUTES)
      setDragBoth({ ...current, endTime: range.endTime })
    }
  }

  const handlePointerUp = () => {
    const current = dragRef.current
    if (!current) return

    if (current.mode === 'create') {
      finishCreate()
      return
    }

    if (current.mode === 'move') {
      if (!current.moved) {
        setDragBoth(null)
        const visit = visits.find((v) => v.id === current.visitId)
        if (visit) onSelectVisit(visit)
        return
      }
      /** 先に永続化側の楽観更新を走らせてからプレビューを外す（一瞬戻るのを防ぐ） */
      onMoveVisit?.(current.visitId, current.teamId, current.startTime, current.endTime)
      setDragBoth(null)
      return
    }

    if (current.mode === 'resize') {
      onResizeVisit?.(current.visitId, current.startTime, current.endTime)
      setDragBoth(null)
    }
  }

  const createPreview =
    drag?.mode === 'create'
      ? resolveDragTimeRange(drag.anchorSlot, drag.currentSlot)
      : null

  return (
    <div
      className="overflow-auto rounded-lg border border-slate-200 bg-white"
      aria-busy={loading}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => setDragBoth(null)}
    >
      <div className="min-w-max">
        <div
          className="sticky top-0 z-10 grid border-b border-slate-200 bg-slate-50"
          style={{
            gridTemplateColumns: `${TIME_GUTTER_PX}px repeat(${teams.length}, ${COLUMN_WIDTH_PX}px)`,
          }}
        >
          <div className="border-r border-slate-200 px-2 py-2 text-[11px] font-bold text-slate-400">
            時刻
          </div>
          {teams.map((team) => (
            <div
              key={team.id}
              className="border-r border-slate-200 px-2 py-2 text-center text-xs font-bold text-slate-800 last:border-r-0"
            >
              <span
                className="mr-1 inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: team.color ?? '#008C01' }}
              />
              {team.name}
            </div>
          ))}
        </div>

        <div
          className="relative grid"
          style={{
            gridTemplateColumns: `${TIME_GUTTER_PX}px repeat(${teams.length}, ${COLUMN_WIDTH_PX}px)`,
            height: BODY_HEIGHT,
          }}
        >
          {nowLineTop != null ? (
            <div
              className="pointer-events-none absolute inset-x-0 z-[3] h-0.5 -translate-y-1/2 bg-rose-500"
              style={{ top: nowLineTop }}
              aria-hidden
            />
          ) : null}

          <div className="relative border-r border-slate-200 bg-slate-50/80">
            {TIME_SLOTS.map((slot) => (
              <div
                key={slot}
                className="absolute left-0 right-0 border-t border-slate-100 px-1 text-[10px] font-bold text-slate-400"
                style={{
                  top: ((slot - GRID_START_MINUTES) / SLOT_MINUTES) * SLOT_HEIGHT_PX,
                  height: SLOT_HEIGHT_PX,
                }}
              >
                {slot % 60 === 0 ? minutesToLabel(slot) : ''}
              </div>
            ))}
          </div>

          {teams.map((team) => {
            const columnVisits = loading
              ? []
              : visits.filter((visit) => visit.team_id === team.id)
            const columnBlocks = loading
              ? []
              : blocks.filter((block) => block.team_id === team.id)
            const showCreatePreview =
              createPreview != null && drag?.mode === 'create' && drag.teamId === team.id
            /** クリック確定時はプレビューを出さない。実移動後だけ「移動中」を表示 */
            const movingHere =
              drag?.mode === 'move' && drag.moved && drag.teamId === team.id
                ? drag
                : null

            return (
              <div
                key={team.id}
                ref={(node) => {
                  columnRefs.current[team.id] = node
                }}
                className={`relative touch-none border-r border-slate-100 last:border-r-0 ${
                  loading ? 'pointer-events-none' : 'cursor-cell'
                }`}
                style={{ height: BODY_HEIGHT }}
                onPointerDown={(event) => handleColumnPointerDown(team.id, event)}
              >
                <DayVisitColumnBody
                  teamId={team.id}
                  loading={loading}
                  timeSlots={TIME_SLOTS}
                  visits={columnVisits}
                  blocks={columnBlocks}
                  createPreview={showCreatePreview ? createPreview : null}
                  movingPreview={
                    movingHere
                      ? { startTime: movingHere.startTime, endTime: movingHere.endTime }
                      : null
                  }
                  resizeVisitId={drag?.mode === 'resize' ? drag.visitId : null}
                  resizeStart={drag?.mode === 'resize' ? drag.startTime : null}
                  resizeEnd={drag?.mode === 'resize' ? drag.endTime : null}
                  hideVisitId={
                    drag?.mode === 'move' && drag.moved ? drag.visitId : null
                  }
                  canResize={Boolean(onResizeVisit)}
                  onVisitPointerDown={(visit, event) =>
                    handleVisitPointerDown(visit, team.id, event)
                  }
                  onResizePointerDown={(visit, event) =>
                    handleResizePointerDown(visit, team.id, event)
                  }
                  onSelectBlock={onSelectBlock}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
