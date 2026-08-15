import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  FEEDBACK_UNREAD_ARIA_LABEL,
  shouldShowFeedbackUnreadDot,
} from './unreadReplyPolicy.ts'

describe('shouldShowFeedbackUnreadDot', () => {
  it('閉じているときだけ未読の点を出す', () => {
    assert.equal(shouldShowFeedbackUnreadDot({ open: false, hasUnreadReply: true }), true)
    assert.equal(shouldShowFeedbackUnreadDot({ open: true, hasUnreadReply: true }), false)
    assert.equal(shouldShowFeedbackUnreadDot({ open: false, hasUnreadReply: false }), false)
  })

  it('未読の案内に件数と Issue を出さない', () => {
    assert.equal(/\d/.test(FEEDBACK_UNREAD_ARIA_LABEL), false)
    assert.equal(/issue|github/i.test(FEEDBACK_UNREAD_ARIA_LABEL), false)
  })
})
