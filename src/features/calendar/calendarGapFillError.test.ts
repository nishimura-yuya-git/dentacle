import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  formatGapFillRateLimitMessage,
  parseRetryAfterSecFromMessage,
} from './calendarGapFillError.ts'

describe('calendarGapFillError', () => {
  it('メッセージから秒数を抜く', () => {
    assert.equal(
      parseRetryAfterSecFromMessage(
        '空き枠埋めは連続実行できません。58秒後までお待ちください。',
      ),
      58,
    )
  })

  it('カウントダウン文言を秒単位で出す', () => {
    assert.equal(
      formatGapFillRateLimitMessage(58),
      '空き枠埋めは連続実行できません。58秒後までお待ちください。',
    )
    assert.equal(
      formatGapFillRateLimitMessage(1),
      '空き枠埋めは連続実行できません。1秒後までお待ちください。',
    )
  })
})
