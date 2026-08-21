import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import {
  resetPlatformAdminTotpEnrollCacheForTests,
  startPlatformAdminTotpEnroll,
} from './startPlatformAdminTotpEnroll.ts'

type FactorRow = { id: string; status: string }

function createFakeMfa(initialUnverified: string[] = [], enrollDelayMs = 0) {
  const unverified = new Set(initialUnverified)
  const unenrollCalls: string[] = []
  let enrollCalls = 0
  let concurrent = 0
  let maxConcurrent = 0

  const client = {
    auth: {
      mfa: {
        async listFactors() {
          const rows: FactorRow[] = [...unverified].map((id) => ({
            id,
            status: 'unverified',
          }))
          return { data: { all: rows, totp: rows }, error: null }
        },
        async unenroll({ factorId }: { factorId: string }) {
          unverified.delete(factorId)
          unenrollCalls.push(factorId)
          return { error: null }
        },
        async enroll() {
          enrollCalls += 1
          concurrent += 1
          maxConcurrent = Math.max(maxConcurrent, concurrent)
          if (enrollDelayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, enrollDelayMs))
          }
          concurrent -= 1
          if (unverified.size > 0) {
            return { data: null, error: { message: 'already exists' } }
          }
          unverified.add('new-factor')
          return {
            data: {
              id: 'new-factor',
              totp: { qr_code: 'data:image/png;base64,xx', secret: 'SECRET12' },
            },
            error: null,
          }
        },
      },
    },
  }

  return {
    client,
    unenrollCalls,
    enrollCalls: () => enrollCalls,
    maxConcurrent: () => maxConcurrent,
  }
}

describe('startPlatformAdminTotpEnroll', () => {
  afterEach(() => {
    resetPlatformAdminTotpEnrollCacheForTests()
  })

  it('未検証の factor を消してから QR を出す', async () => {
    const fake = createFakeMfa(['left-over'])
    const result = await startPlatformAdminTotpEnroll('user-1', fake.client)
    assert.deepEqual(result, {
      ok: true,
      factorId: 'new-factor',
      qrCode: 'data:image/png;base64,xx',
      secret: 'SECRET12',
    })
    assert.deepEqual(fake.unenrollCalls, ['left-over'])
    assert.equal(fake.enrollCalls(), 1)
  })

  it('同じユーザーの並行呼び出しは enroll を1回にする', async () => {
    const fake = createFakeMfa([], 40)
    const [first, second] = await Promise.all([
      startPlatformAdminTotpEnroll('user-1', fake.client),
      startPlatformAdminTotpEnroll('user-1', fake.client),
    ])
    assert.equal(first.ok, true)
    assert.equal(second.ok, true)
    assert.equal(fake.enrollCalls(), 1)
    assert.equal(fake.maxConcurrent(), 1)
  })
})
