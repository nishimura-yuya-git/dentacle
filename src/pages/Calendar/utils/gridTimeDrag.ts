import {
  GRID_END_MINUTES,
  GRID_START_MINUTES,
  SLOT_HEIGHT_PX,
  SLOT_MINUTES,
  minutesToLabel,
} from './calendarGrid.ts'

/** クリックのみのときの既定所要時間（分） */
export const DEFAULT_CLICK_DURATION_MINUTES = 30

export type DragTimeRange = {
  startTime: string
  endTime: string
}

/** グリッド内の Y 座標をスロット開始分にスナップ */
export function yOffsetToSlotStart(y: number): number {
  const raw =
    GRID_START_MINUTES + Math.floor(y / SLOT_HEIGHT_PX) * SLOT_MINUTES
  const maxStart = GRID_END_MINUTES - SLOT_MINUTES
  return Math.min(maxStart, Math.max(GRID_START_MINUTES, raw))
}

/** 上／下どちらのドラッグでも開始≦終了の時間帯にする（終了は選択スロットの末尾） */
export function resolveDragTimeRange(
  anchorSlotStart: number,
  currentSlotStart: number
): DragTimeRange {
  const start = Math.min(anchorSlotStart, currentSlotStart)
  const end = Math.max(anchorSlotStart, currentSlotStart) + SLOT_MINUTES
  return {
    startTime: minutesToLabel(start),
    endTime: minutesToLabel(Math.min(end, GRID_END_MINUTES)),
  }
}

/** 同一スロット＝クリック扱い */
export function isClickSelection(
  anchorSlotStart: number,
  currentSlotStart: number
): boolean {
  return anchorSlotStart === currentSlotStart
}

/** クリック時は開始＋既定所要時間、ドラッグ時は実範囲 */
export function resolveCreateTimeRange(
  anchorSlotStart: number,
  currentSlotStart: number
): DragTimeRange {
  if (isClickSelection(anchorSlotStart, currentSlotStart)) {
    const end = Math.min(
      anchorSlotStart + DEFAULT_CLICK_DURATION_MINUTES,
      GRID_END_MINUTES
    )
    return {
      startTime: minutesToLabel(anchorSlotStart),
      endTime: minutesToLabel(end),
    }
  }
  return resolveDragTimeRange(anchorSlotStart, currentSlotStart)
}
