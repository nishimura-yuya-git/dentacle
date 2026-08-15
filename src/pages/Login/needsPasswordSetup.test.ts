import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { needsPasswordSetup } from './needsPasswordSetup.ts'

describe('needsPasswordSetup', () => {
  it('招待直後のフラグだけを見る', () => {
    assert.equal(needsPasswordSetup({ user_metadata: { must_set_password: true } }), true)
    assert.equal(needsPasswordSetup({ user_metadata: { must_set_password: false } }), false)
    assert.equal(needsPasswordSetup(null), false)
  })
})
