import assert from 'node:assert/strict'
import {
  GRID_END_MINUTES,
  GRID_START_MINUTES,
  SLOT_HEIGHT_PX,
  SLOT_MINUTES,
} from './calendarGrid.ts'
import { minutesToGridTopPx, resolveNowLineTopPx } from './nowLine.ts'

assert.equal(minutesToGridTopPx(GRID_START_MINUTES), 0)
assert.equal(
  minutesToGridTopPx(GRID_START_MINUTES + SLOT_MINUTES),
  SLOT_HEIGHT_PX
)

const midday = new Date(2026, 7, 9, 11, 52, 30)
assert.equal(resolveNowLineTopPx('2026-08-09', midday) != null, true)
assert.equal(
  Math.round(resolveNowLineTopPx('2026-08-09', midday) ?? -1),
  Math.round(
    ((11 * 60 + 52.5 - GRID_START_MINUTES) / SLOT_MINUTES) * SLOT_HEIGHT_PX
  )
)

assert.equal(resolveNowLineTopPx('2026-08-08', midday), null)

const beforeOpen = new Date(2026, 7, 9, 8, 59, 0)
assert.equal(resolveNowLineTopPx('2026-08-09', beforeOpen), null)

const atEnd = new Date(2026, 7, 9, 18, 0, 0)
assert.equal(GRID_END_MINUTES, 18 * 60)
assert.equal(resolveNowLineTopPx('2026-08-09', atEnd), null)

console.log('nowLine.test.ts: ok')
