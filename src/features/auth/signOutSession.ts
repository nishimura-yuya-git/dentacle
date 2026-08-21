export type SignOutAuthClient = {
  auth: {
    signOut: (options?: {
      scope?: 'global' | 'local'
    }) => Promise<{ error: { message: string } | null }>
  }
}

const DEFAULT_WAIT_MS = 2500

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export function clearPersistedSupabaseAuthTokens(
  storage: Pick<Storage, 'key' | 'length' | 'removeItem'> | null = typeof localStorage === 'undefined'
    ? null
    : localStorage,
): void {
  if (!storage) return
  const keys: string[] = []
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (key) keys.push(key)
  }
  for (const key of keys) {
    if (key.startsWith('sb-') && key.includes('-auth-token')) {
      storage.removeItem(key)
    }
  }
}

/**
 * セッションを必ず切る。サーバー側ログアウトが失敗・無応答でも、この端末の保存分は捨てる。
 * 監査 RPC はここでは待たない。
 */
export async function signOutSession(
  client: SignOutAuthClient,
  options: { waitMs?: number } = {},
): Promise<void> {
  const waitMs = options.waitMs ?? DEFAULT_WAIT_MS
  const globalResult = await Promise.race([
    client.auth.signOut({ scope: 'global' }).catch(() => ({
      error: { message: 'threw' },
    })),
    wait(waitMs).then(() => ({ error: { message: 'timeout' } })),
  ])

  if (!globalResult.error) return

  await Promise.race([
    client.auth.signOut({ scope: 'local' }).catch(() => undefined),
    wait(waitMs),
  ])
  clearPersistedSupabaseAuthTokens()
}
