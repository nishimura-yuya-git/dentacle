import assert from 'node:assert/strict'
import { toLoginErrorMessage } from './authErrors.ts'

assert.equal(
  toLoginErrorMessage({ message: 'Invalid login credentials' }),
  'メールアドレスまたはパスワードが正しくありません。'
)

assert.equal(
  toLoginErrorMessage({ message: 'Email not confirmed' }),
  'メールアドレスの確認が完了していません。管理者にお問い合わせください。'
)

assert.equal(
  toLoginErrorMessage({ message: 'Too many requests', status: 429 }),
  'しばらく時間をおいてから再度お試しください。'
)

assert.equal(
  toLoginErrorMessage(null),
  'ログインに失敗しました。もう一度お試しください。'
)

console.log('authErrors.test.ts: ok')
