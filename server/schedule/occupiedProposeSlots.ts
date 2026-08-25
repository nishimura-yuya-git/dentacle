import { timeToSeconds } from '../../src/utils/schedule/proposalLanePresets.ts'
import type { OccupiedVisit } from './types.ts'

export function occupiedVisitsOf(
  occupied: OccupiedVisit[] | undefined,
): OccupiedVisit[] {
  return occupied ?? []
}

export function normalizeOccupiedHms(value: string): string {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim())
  if (!match) return value
  const hh = String(Number(match[1])).padStart(2, '0')
  const mm = String(Number(match[2])).padStart(2, '0')
  const ss = String(Number(match[3] ?? '0')).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

export function intervalsOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
): boolean {
  return startA < endB && startB < endA
}

export function occupiedVisitsForTeam(
  occupied: OccupiedVisit[] | undefined,
  teamIndex: number,
): OccupiedVisit[] {
  return occupiedVisitsOf(occupied)
    .filter((row) => row.teamIndex === teamIndex)
    .slice()
    .sort((a, b) => timeToSeconds(a.start) - timeToSeconds(b.start))
}

export function slotOverlapsOccupied(input: {
  teamIndex: number
  start: string
  end: string
  occupied: OccupiedVisit[] | undefined
}): OccupiedVisit | null {
  const startSec = timeToSeconds(input.start)
  const endSec = timeToSeconds(input.end)
  for (const row of occupiedVisitsForTeam(input.occupied, input.teamIndex)) {
    if (
      intervalsOverlap(
        startSec,
        endSec,
        timeToSeconds(row.start),
        timeToSeconds(row.end),
      )
    ) {
      return row
    }
  }
  return null
}

export type FreeWindow = {
  startSec: number
  endSec: number
}

/**
 * 既存枠の前後に移動ギャップを残した空き帯。
 * 既存枠自体は動かさない。
 */
export function freeWindowsForTeam(input: {
  dayStartSec: number
  dayEndSec: number
  occupied: OccupiedVisit[] | undefined
  teamIndex: number
  travelGapMinutes: number
}): FreeWindow[] {
  const gapSec = Math.max(0, input.travelGapMinutes) * 60
  const occupied = occupiedVisitsForTeam(input.occupied, input.teamIndex)
  const windows: FreeWindow[] = []
  let cursor = input.dayStartSec

  for (const row of occupied) {
    const occStart = timeToSeconds(row.start)
    const occEnd = timeToSeconds(row.end)
    const windowEnd = occStart - gapSec
    if (windowEnd > cursor) {
      windows.push({ startSec: cursor, endSec: windowEnd })
    }
    cursor = Math.max(cursor, occEnd + gapSec)
  }

  if (input.dayEndSec > cursor) {
    windows.push({ startSec: cursor, endSec: input.dayEndSec })
  }

  return windows
}
