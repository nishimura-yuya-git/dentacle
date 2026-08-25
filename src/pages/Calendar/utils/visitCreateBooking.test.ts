import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  createVisitRegisteredMessage,
  resolveCreateVisitStatus,
} from './visitCreateBooking.ts'

describe('visitCreateBooking', () => {
  it('未指定と仮予約は tentative、確定だけ confirmed にする', () => {
    assert.equal(resolveCreateVisitStatus(undefined), 'tentative')
    assert.equal(resolveCreateVisitStatus('tentative'), 'tentative')
    assert.equal(resolveCreateVisitStatus('confirmed'), 'confirmed')
  })

  it('登録後メッセージは状態で分ける', () => {
    assert.equal(
      createVisitRegisteredMessage('tentative'),
      '仮予約を登録し、電話確認キューに追加しました',
    )
    assert.equal(createVisitRegisteredMessage('confirmed'), '本予約として登録しました')
  })
})
