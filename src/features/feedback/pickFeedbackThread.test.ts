import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { pickFeedbackThread } from './pickFeedbackThread.ts'

describe('pickFeedbackThread', () => {
  it('未読スレッドを、より新しい下書きより優先する', () => {
    const picked = pickFeedbackThread([
      { id: 'newer-draft', createdAt: '2026-08-15T12:00:00.000Z', hasUnreadReply: false },
      { id: 'unread', createdAt: '2026-08-14T09:00:00.000Z', hasUnreadReply: true },
    ])
    assert.equal(picked?.id, 'unread')
  })

  it('未読が複数なら新しい未読を開く', () => {
    const picked = pickFeedbackThread([
      { id: 'old-unread', createdAt: '2026-08-10T09:00:00.000Z', hasUnreadReply: true },
      { id: 'new-unread', createdAt: '2026-08-14T09:00:00.000Z', hasUnreadReply: true },
    ])
    assert.equal(picked?.id, 'new-unread')
  })

  it('未読がなければ最新スレッドを開く', () => {
    const picked = pickFeedbackThread([
      { id: 'old', createdAt: '2026-08-10T09:00:00.000Z', hasUnreadReply: false },
      { id: 'latest', createdAt: '2026-08-15T12:00:00.000Z', hasUnreadReply: false },
    ])
    assert.equal(picked?.id, 'latest')
  })

  it('スレッドがなければ null', () => {
    assert.equal(pickFeedbackThread([]), null)
  })
})
