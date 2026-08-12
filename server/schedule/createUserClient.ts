import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/** サーバー側でユーザー JWT 付きの Supabase クライアントを作る（RLS 適用） */
export function createUserSupabaseClient(
  accessToken: string,
  env: NodeJS.ProcessEnv = process.env,
): SupabaseClient {
  const url =
    env.SUPABASE_URL?.trim() ||
    env.VITE_SUPABASE_URL?.trim()
  const anonKey =
    env.SUPABASE_ANON_KEY?.trim() ||
    env.VITE_SUPABASE_ANON_KEY?.trim()

  if (!url || !anonKey) {
    throw new Error(
      'SUPABASE_URL / SUPABASE_ANON_KEY（または VITE_ 相当）が未設定です',
    )
  }

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })
}
