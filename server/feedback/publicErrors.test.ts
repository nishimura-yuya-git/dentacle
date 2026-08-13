import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { PUBLIC_FEEDBACK_ERROR } from './publicErrors.ts'

describe('ご意見の公開エラー', () => {
  it('未設定時も院向けに Issue と書かない', () => {
    assert.equal(/issue/i.test(PUBLIC_FEEDBACK_ERROR.not_configured), false)
    assert.match(PUBLIC_FEEDBACK_ERROR.not_configured, /受付準備/)
  })
})
