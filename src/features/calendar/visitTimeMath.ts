import {
  GRID_END_MINUTES,
  GRID_START_MINUTES,
  SLOT_MINUTES,
  minutesToLabel,
  timeToMinutes,
} from '@/pages/Calendar/utils/calendarGrid'

export function clampSlotMinutes(total: number): number {
  const snapped = Math.round(total / SLOT_MINUTES) * SLOT_MINUTES
  return Math.min(GRID_END_MINUTES - SLOT_MINUTES, Math.max(GRID_START_MINUTES, snapped))
}

export function addMinutesToTime(hhmm: string, deltaMinutes: number): string {
  return minutesToLabel(clampSlotMinutes(timeToMinutes(hhmm) + deltaMinutes))
}

export function durationMinutes(start: string, end: string): number {
  return Math.max(SLOT_MINUTES, timeToMinutes(end) - timeToMinutes(start))
}

/** 開始を動かしたとき、長さを保って終了を再計算 */
export function shiftRangeKeepingDuration(
  start: string,
  end: string,
  nextStartMinutes: number,
): { startTime: string; endTime: string } {
  const length = durationMinutes(start, end)
  let startMin = clampSlotMinutes(nextStartMinutes)
  let endMin = startMin + length
  if (endMin > GRID_END_MINUTES) {
    endMin = GRID_END_MINUTES
    startMin = Math.max(GRID_START_MINUTES, endMin - length)
  }
  return {
    startTime: minutesToLabel(startMin),
    endTime: minutesToLabel(endMin),
  }
}

export function resizeRangeEnd(
  start: string,
  nextEndMinutes: number,
): { startTime: string; endTime: string } {
  const startMin = timeToMinutes(start)
  let endMin = clampSlotMinutes(nextEndMinutes)
  if (endMin <= startMin) endMin = startMin + SLOT_MINUTES
  if (endMin > GRID_END_MINUTES) endMin = GRID_END_MINUTES
  return {
    startTime: minutesToLabel(startMin),
    endTime: minutesToLabel(endMin),
  }
}
