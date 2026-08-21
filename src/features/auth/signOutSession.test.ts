import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { signOutSession, clearPersistedSupabaseAuthTokens, type SignOutAuthClient } from './signOutSession.ts'

function createClient(options: {
  global?: 'ok' | 'error' | 'slow'
  local?: 'ok' | 'error' | 'slow'
}): { client: SignOutAuthClient; scopes: string[] } {
  const scopes: string[] = []
  const client: SignOutAuthClient = {
    auth: {
      async signOut(optionsArg) {
        const scope = optionsArg?.scope ?? 'global'
        scopes.push(scope)
        const mode = scope === 'local' ? (options.local ?? 'ok') : (options.global ?? 'ok')
        if (mode === 'slow') {
          await new Promise((resolve) => setTimeout(resolve, 200))
          return { error: { message: 'too late' } }
        }
        if (mode === 'error') {
          return { error: { message: 'sign out failed' } }
        }
        return { error: null }
      },
    },
  }
  return { client, scopes }
}

describe('signOutSession', () => {
  it('全体ログアウトが成功したらローカルには倒さない', async () => {
    const { client, scopes } = createClient({ global: 'ok' })
    await signOutSession(client, { waitMs: 40 })
    assert.deepEqual(scopes, ['global'])
  })

  it('全体ログアウトが失敗したらこの端末だけ切る', async () => {
    const { client, scopes } = createClient({ global: 'error', local: 'ok' })
    await signOutSession(client, { waitMs: 40 })
    assert.deepEqual(scopes, ['global', 'local'])
  })

  it('全体ログアウトが応答しないときも待ち時間後にこの端末を切って完了する', async () => {
    const { client, scopes } = createClient({ global: 'slow', local: 'ok' })
    const started = Date.now()
    await signOutSession(client, { waitMs: 40 })
    assert.ok(Date.now() - started < 150)
    assert.deepEqual(scopes, ['global', 'local'])
  })

  it('保存された Auth トークンだけを消す', () => {
    const store = new Map<string, string>([
      ['sb-xxxx-auth-token', 'session'],
      ['dentacle.activeClinicId', 'clinic'],
    ])
    const storage = {
      get length() {
        return store.size
      },
      key(index: number) {
        return [...store.keys()][index] ?? null
      },
      removeItem(key: string) {
        store.delete(key)
      },
    }
    clearPersistedSupabaseAuthTokens(storage)
    assert.equal(store.has('sb-xxxx-auth-token'), false)
    assert.equal(store.has('dentacle.activeClinicId'), true)
  })
})
