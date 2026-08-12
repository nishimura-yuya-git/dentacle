import type { SupabaseClient } from '@supabase/supabase-js'
import {
  DEFAULT_PLATFORM_CURSOR_MODEL_ID,
  normalizePlatformCursorModelId,
  type PlatformCursorModelId,
} from '../../src/config/aiModelOptions.ts'

/**
 * 全院共通の Cursor モデル ID を読む。
 * 行が無い／読めない場合は既定（grok-4.5）。
 */
export async function loadPlatformCursorModel(
  supabase: SupabaseClient,
): Promise<PlatformCursorModelId> {
  const { data, error } = await supabase
    .from('platform_ai_settings')
    .select('cursor_model_id')
    .eq('id', 1)
    .maybeSingle()

  if (error || !data) {
    return DEFAULT_PLATFORM_CURSOR_MODEL_ID
  }
  return normalizePlatformCursorModelId(data.cursor_model_id)
}
