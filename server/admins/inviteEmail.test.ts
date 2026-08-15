import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isAlreadyRegisteredAuthError, normalizeInviteEmail } from './inviteEmail.ts'

describe('normalizeInviteEmail', () => {
  it('前後空白を除いて小文字にする', () => {
    assert.equal(normalizeInviteEmail('  Ada@Example.COM '), 'ada@example.com')
  })

  it('不正な値は受けない', () => {
    assert.equal(normalizeInviteEmail(''), null)
    assert.equal(normalizeInviteEmail('not-email'), null)
  })
})

describe('isAlreadyRegisteredAuthError', () => {
  it('既存アカウントの英文を判定する', () => {
    assert.equal(
      isAlreadyRegisteredAuthError('A user with this email address has already been registered'),
      true,
    )
    assert.equal(isAlreadyRegisteredAuthError('rate limit exceeded'), false)
  })
})
