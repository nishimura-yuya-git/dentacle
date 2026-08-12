import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildMinuteOptions,
  formatTimeHm,
  parseTimeHm,
  snapMinute,
} from './timePickerUtils.ts'

describe('timePickerUtils', () => {
  it('HH:mm と HH:mm:ss をパースする', () => {
    assert.deepEqual(parseTimeHm('09:30'), { hour: 9, minute: 30 })
    assert.deepEqual(parseTimeHm('9:05:00'), { hour: 9, minute: 5 })
  })

  it('分をステップへ丸める', () => {
    assert.equal(snapMinute(32, 5), 30)
    assert.equal(snapMinute(33, 5), 35)
  })

  it('5分刻みの候補を返す', () => {
    const mins = buildMinuteOptions(5)
    assert.equal(mins.length, 12)
    assert.equal(mins[0]?.label, '00')
    assert.equal(mins[6]?.label, '30')
  })

  it('表示用にゼロ埋めする', () => {
    assert.equal(formatTimeHm(9, 5), '09:05')
  })
})
