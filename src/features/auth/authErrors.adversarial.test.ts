import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { toLoginErrorMessage } from './authErrors.ts'
import {
  isAllowlistedPublicAuthMessage,
  LOGIN_ADVERSARIAL_INPUTS,
} from './loginSecurityContract.ts'

describe('toLoginErrorMessage 敵対入力', () => {
  it('1=1 / OR 結合 / XSS を含む生メッセージを画面に出さない', () => {
    for (const payload of LOGIN_ADVERSARIAL_INPUTS) {
      const output = toLoginErrorMessage({ message: payload })
      assert.equal(
        isAllowlistedPublicAuthMessage(output),
        true,
        `許可外の文言: ${output}`,
      )
      assert.equal(
        output.includes(payload),
        false,
        '入力をそのまま返してはならない',
      )
      assert.equal(/<script/i.test(output), false)
      assert.equal(/javascript:/i.test(output), false)
      assert.equal(/DROP TABLE/i.test(output), false)
    }
  })

  it('既知の Auth 文言に HTML が混ざっても固定日本語だけ返す', () => {
    assert.equal(
      toLoginErrorMessage({
        message: 'Invalid login credentials <script>alert(1)</script>',
      }),
      'メールアドレスまたはパスワードが正しくありません。',
    )
    assert.equal(
      toLoginErrorMessage({
        message: 'Too many requests <img src=x onerror=alert(1)>',
        status: 429,
      }),
      'しばらく時間をおいてから再度お試しください。',
    )
  })

  it('null / 空は汎用失敗文に倒す', () => {
    assert.equal(
      toLoginErrorMessage(null),
      'ログインに失敗しました。もう一度お試しください。',
    )
    assert.equal(
      toLoginErrorMessage({ message: '' }),
      'ログインに失敗しました。もう一度お試しください。',
    )
  })
})
