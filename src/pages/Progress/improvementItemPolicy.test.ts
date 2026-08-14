import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  countImprovementByStatus,
  formatImprovementStatusLabel,
  isImprovementStatus,
} from './improvementItemPolicy.ts'

describe('improvementItemPolicy', () => {
  it('受付・確認中・対応中・反映済み・見送りだけを状態として認める', () => {
    assert.equal(isImprovementStatus('received'), true)
    assert.equal(isImprovementStatus('reviewing'), true)
    assert.equal(isImprovementStatus('in_progress'), true)
    assert.equal(isImprovementStatus('done'), true)
    assert.equal(isImprovementStatus('wont_fix'), true)
    assert.equal(isImprovementStatus('published'), false)
    assert.equal(isImprovementStatus('proposed'), false)
  })

  it('状態ラベルは日本語である', () => {
    assert.equal(formatImprovementStatusLabel('received'), '受付')
    assert.equal(formatImprovementStatusLabel('reviewing'), '確認中')
    assert.equal(formatImprovementStatusLabel('in_progress'), '対応中')
    assert.equal(formatImprovementStatusLabel('done'), '反映済み')
    assert.equal(formatImprovementStatusLabel('wont_fix'), '見送り')
  })

  it('状態ごとの件数を集計する', () => {
    const counts = countImprovementByStatus([
      { status: 'received' },
      { status: 'received' },
      { status: 'in_progress' },
      { status: 'done' },
    ])
    assert.equal(counts.received, 2)
    assert.equal(counts.reviewing, 0)
    assert.equal(counts.in_progress, 1)
    assert.equal(counts.done, 1)
    assert.equal(counts.wont_fix, 0)
  })
})
