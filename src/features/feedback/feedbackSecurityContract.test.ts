import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { LOGIN_ADVERSARIAL_INPUTS } from '../auth/loginSecurityContract.ts'
import { PUBLIC_FEEDBACK_ERROR } from '../../../server/feedback/publicErrors.ts'
import {
  FEEDBACK_CLIENT_FALLBACK,
  FEEDBACK_SESSION_REQUIRED,
  isAllowlistedPublicFeedbackMessage,
  toClientFeedbackError,
} from './feedbackSecurityContract.ts'

describe('isAllowlistedPublicFeedbackMessage', () => {
  it('サーバー公開エラーは許可する', () => {
    for (const message of Object.values(PUBLIC_FEEDBACK_ERROR)) {
      assert.equal(isAllowlistedPublicFeedbackMessage(message), true, message)
    }
    assert.equal(isAllowlistedPublicFeedbackMessage(FEEDBACK_SESSION_REQUIRED), true)
    assert.equal(
      isAllowlistedPublicFeedbackMessage('連続送信はできません。12秒後までお待ちください。'),
      true,
    )
  })

  it('Auth 生メッセージや HTML は許可しない', () => {
    assert.equal(isAllowlistedPublicFeedbackMessage('Invalid login credentials'), false)
    assert.equal(isAllowlistedPublicFeedbackMessage('<script>alert(1)</script>'), false)
    assert.equal(isAllowlistedPublicFeedbackMessage("' OR 1=1 --"), false)
  })
})

describe('toClientFeedbackError', () => {
  it('許可リスト外は固定文へ倒す', () => {
    for (const input of LOGIN_ADVERSARIAL_INPUTS) {
      assert.equal(toClientFeedbackError(input), FEEDBACK_CLIENT_FALLBACK)
    }
    assert.equal(toClientFeedbackError('Invalid login credentials'), FEEDBACK_CLIENT_FALLBACK)
    assert.equal(toClientFeedbackError(undefined, 503), 'ご意見の送信に失敗しました（HTTP 503）')
    assert.equal(toClientFeedbackError('本文を入力してください'), '本文を入力してください')
  })
})
