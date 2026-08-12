import assert from 'node:assert/strict'
import {
  PROPOSE_COOLDOWN_MS,
  releaseProposeSlot,
  resetProposeRateLimitForTests,
  tryAcquireProposeSlot,
} from './proposeRateLimit.ts'

resetProposeRateLimitForTests()

{
  const t0 = 1_000_000
  const first = tryAcquireProposeSlot('clinic-a', t0)
  assert.equal(first.ok, true)

  const inFlight = tryAcquireProposeSlot('clinic-a', t0 + 1000)
  assert.equal(inFlight.ok, false)
  if (!inFlight.ok) {
    assert.equal(inFlight.reason, 'in_flight')
    assert.ok(inFlight.retryAfterSec >= 1)
  }

  // 別クリニックは独立
  const other = tryAcquireProposeSlot('clinic-b', t0 + 1000)
  assert.equal(other.ok, true)
  releaseProposeSlot('clinic-b', t0 + 1000)
}

{
  const t0 = 2_000_000
  resetProposeRateLimitForTests()
  assert.equal(tryAcquireProposeSlot('clinic-a', t0).ok, true)
  releaseProposeSlot('clinic-a', t0 + 5000)

  const cooling = tryAcquireProposeSlot('clinic-a', t0 + 5000 + 1000)
  assert.equal(cooling.ok, false)
  if (!cooling.ok) {
    assert.equal(cooling.reason, 'cooldown')
  }

  const after = tryAcquireProposeSlot(
    'clinic-a',
    t0 + 5000 + PROPOSE_COOLDOWN_MS,
  )
  assert.equal(after.ok, true)
  releaseProposeSlot('clinic-a', t0 + 5000 + PROPOSE_COOLDOWN_MS)
}

console.log('server/schedule/proposeRateLimit.test.ts: ok')
