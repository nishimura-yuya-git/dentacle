import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  evaluatePlatformAdminMfaGate,
  fetchIsPlatformAdmin,
} from './platformMfaGate.ts'

type AppClient = Parameters<typeof evaluatePlatformAdminMfaGate>[0]

function mockMfaClient(options: {
  aalError?: boolean
  currentLevel?: 'aal1' | 'aal2'
  factorsError?: boolean
  verifiedFactorId?: string
}): AppClient {
  return {
    auth: {
      mfa: {
        getAuthenticatorAssuranceLevel: async () =>
          options.aalError
            ? { data: null, error: { message: 'aal failed' } }
            : { data: { currentLevel: options.currentLevel ?? 'aal1' }, error: null },
        listFactors: async () =>
          options.factorsError
            ? { data: null, error: { message: 'factors failed' } }
            : {
                data: {
                  totp: options.verifiedFactorId
                    ? [{ status: 'verified', id: options.verifiedFactorId }]
                    : [],
                },
                error: null,
              },
      },
    },
  } as AppClient
}

describe('evaluatePlatformAdminMfaGate', () => {
  it('一般ユーザーは MFA なしで通す', async () => {
    const gate = await evaluatePlatformAdminMfaGate({} as AppClient, false)
    assert.deepEqual(gate, { status: 'ok' })
  })

  it('運営で AAL 取得失敗は enroll に倒し、業務画面へ進まない', async () => {
    const gate = await evaluatePlatformAdminMfaGate(mockMfaClient({ aalError: true }), true)
    assert.deepEqual(gate, { status: 'enroll' })
  })

  it('運営で AAL2 なら通す', async () => {
    const gate = await evaluatePlatformAdminMfaGate(mockMfaClient({ currentLevel: 'aal2' }), true)
    assert.deepEqual(gate, { status: 'ok' })
  })

  it('運営で検証済み TOTP があるときは challenge', async () => {
    const gate = await evaluatePlatformAdminMfaGate(
      mockMfaClient({ currentLevel: 'aal1', verifiedFactorId: 'factor-1' }),
      true,
    )
    assert.deepEqual(gate, { status: 'challenge', factorId: 'factor-1' })
  })
})

describe('fetchIsPlatformAdmin', () => {
  it('RPC 失敗は false（権限昇格しない）', async () => {
    const client = {
      rpc: async () => ({ data: null, error: { message: 'permission denied' } }),
    } as unknown as AppClient
    assert.equal(await fetchIsPlatformAdmin(client), false)
  })

  it('真のときだけ true', async () => {
    const client = {
      rpc: async () => ({ data: true, error: null }),
    } as unknown as AppClient
    assert.equal(await fetchIsPlatformAdmin(client), true)
  })
})
