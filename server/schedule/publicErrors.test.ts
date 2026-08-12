import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  formatProposeWaitLabel,
  toRateLimitedProposeError,
} from './publicErrors.ts'

test('formatProposeWaitLabel: 秒と分', () => {
  assert.equal(formatProposeWaitLabel(1), '1秒後')
  assert.equal(formatProposeWaitLabel(45), '45秒後')
  assert.equal(formatProposeWaitLabel(60), '1分後')
  assert.equal(formatProposeWaitLabel(90), '約2分後')
})

test('toRateLimitedProposeError: 待機時間を明示する', () => {
  assert.match(
    toRateLimitedProposeError(60, 'cooldown'),
    /1分後までお待ちください/,
  )
  assert.match(
    toRateLimitedProposeError(30, 'in_flight'),
    /処理中です。30秒後までお待ちください/,
  )
})
