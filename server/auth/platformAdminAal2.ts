import type { SupabaseClient } from '@supabase/supabase-js'

/** 運営の危険操作。身分だけ（is_platform_admin）では足りない。 */
export async function fetchIsPlatformAdminAal2(
  client: SupabaseClient,
): Promise<boolean> {
  const { data, error } = await client.rpc('is_platform_admin_aal2')
  return !error && data === true
}
