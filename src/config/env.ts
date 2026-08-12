/**
 * フロント公開環境変数の読み取り。
 * サーバー専用の特権キーはここへ追加しない。
 */

function requiredViteEnv(name: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY'): string {
  const value = import.meta.env[name]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(
      `${name} が未設定です。.env.local に Supabase の値を設定してください。`
    )
  }
  return value.trim()
}

export const env = {
  appName: (import.meta.env.VITE_APP_NAME as string | undefined)?.trim() || 'デンタクル',
  get supabaseUrl() {
    return requiredViteEnv('VITE_SUPABASE_URL')
  },
  get supabaseAnonKey() {
    return requiredViteEnv('VITE_SUPABASE_ANON_KEY')
  },
  isDev: import.meta.env.DEV,
}
