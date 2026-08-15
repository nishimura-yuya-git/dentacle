import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { validateNewPassword } from './setPasswordPolicy.ts'

describe('validateNewPassword', () => {
  it('8文字以上で一致すれば通す', () => {
    assert.equal(validateNewPassword('abcdefgh', 'abcdefgh'), null)
  })

  it('短い・不一致は止める', () => {
    assert.match(validateNewPassword('short', 'short') ?? '', /8文字/)
    assert.match(validateNewPassword('abcdefgh', 'abcdefgH') ?? '', /一致/)
  })
})
