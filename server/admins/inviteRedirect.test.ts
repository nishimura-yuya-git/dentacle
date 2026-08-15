import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { resolveInviteRedirectTo } from './inviteRedirect.ts'

describe('resolveInviteRedirectTo', () => {
  it('許可した Origin ならその /set-password を使う', () => {
    assert.equal(
      resolveInviteRedirectTo('http://localhost:5173', {}),
      'http://localhost:5173/set-password',
    )
  })

  it('未知の Origin は APP_ORIGIN かローカルへ倒す', () => {
    assert.equal(
      resolveInviteRedirectTo('https://evil.example', {
        APP_ORIGIN: 'https://app.example',
      }),
      'https://app.example/set-password',
    )
  })
})
