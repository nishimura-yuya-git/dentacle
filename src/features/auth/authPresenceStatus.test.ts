import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isAuthPresenceOnline } from './authPresenceStatus.ts'

describe('isAuthPresenceOnline', () => {
  it('直近の last_seen は在席', () => {
    const now = Date.parse('2026-08-12T07:00:00.000Z')
    const lastSeen = '2026-08-12T06:59:30.000Z'
    assert.equal(isAuthPresenceOnline(lastSeen, now, 60), true)
  })

  it('閾値を超えた last_seen は非在席', () => {
    const now = Date.parse('2026-08-12T07:00:00.000Z')
    const lastSeen = '2026-08-12T06:58:50.000Z'
    assert.equal(isAuthPresenceOnline(lastSeen, now, 60), false)
  })

  it('不正な日時は非在席', () => {
    assert.equal(isAuthPresenceOnline('not-a-date', Date.now(), 60), false)
  })
})
