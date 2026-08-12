import assert from 'node:assert/strict'
import { SLOT_HEIGHT_PX } from './calendarGrid.ts'
import {
  isClickSelection,
  resolveCreateTimeRange,
  resolveDragTimeRange,
  yOffsetToSlotStart,
} from './gridTimeDrag.ts'

assert.equal(yOffsetToSlotStart(0), 9 * 60)
assert.equal(yOffsetToSlotStart(SLOT_HEIGHT_PX - 1), 9 * 60)
assert.equal(yOffsetToSlotStart(SLOT_HEIGHT_PX), 9 * 60 + 15)

assert.deepEqual(resolveDragTimeRange(9 * 60, 9 * 60 + 45), {
  startTime: '09:00',
  endTime: '10:00',
})

assert.deepEqual(resolveDragTimeRange(10 * 60, 9 * 60 + 30), {
  startTime: '09:30',
  endTime: '10:15',
})

assert.equal(isClickSelection(9 * 60 + 15, 9 * 60 + 15), true)
assert.equal(isClickSelection(9 * 60, 9 * 60 + 15), false)

assert.deepEqual(resolveCreateTimeRange(9 * 60 + 30, 9 * 60 + 30), {
  startTime: '09:30',
  endTime: '10:00',
})

assert.deepEqual(resolveCreateTimeRange(9 * 60, 10 * 60), {
  startTime: '09:00',
  endTime: '10:15',
})

console.log('gridTimeDrag.test.ts: ok')
