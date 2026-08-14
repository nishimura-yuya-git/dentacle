import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  formatImprovementDate,
  formatImprovementPageLabel,
} from './formatImprovementItem.ts'

describe('formatImprovementItem', () => {
  it('日付は年月日で、月日をゼロ埋めしない', () => {
    assert.equal(formatImprovementDate('2026-08-14T12:00:00.000Z'), '2026年8月14日')
    assert.equal(formatImprovementDate(''), '—')
    assert.equal(formatImprovementDate('not-a-date'), '—')
  })

  it('既知の画面パスだけ日本語にする', () => {
    assert.equal(formatImprovementPageLabel('/calendar'), 'カレンダー')
    assert.equal(formatImprovementPageLabel('/patients'), '患者管理')
    assert.equal(formatImprovementPageLabel('/unknown'), null)
    assert.equal(formatImprovementPageLabel(null), null)
  })
})
