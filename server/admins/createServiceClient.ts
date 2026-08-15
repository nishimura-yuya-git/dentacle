import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export function createServiceSupabaseClient(
  env: NodeJS.ProcessEnv = process.env,
): SupabaseClient {
  const url = env.SUPABASE_URL?.trim() || env.VITE_SUPABASE_URL?.trim()
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !serviceKey) {
    throw new Error('not_configured')
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}
