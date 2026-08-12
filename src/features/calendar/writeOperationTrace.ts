import { supabase } from '@/lib/supabase'
import type { Json } from '@/types/database.types'

/** 操作トレースを残す（失敗しても業務処理は止めない） */
export async function writeOperationTrace(input: {
  clinicId: string
  userId: string | null
  action: string
  entityType: string
  entityId?: string | null
  payload?: Record<string, unknown>
}): Promise<void> {
  try {
    await supabase.from('operation_traces').insert({
      clinic_id: input.clinicId,
      actor_user_id: input.userId,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      payload: (input.payload ?? {}) as Json,
    })
  } catch {
    // 監査失敗で業務を止めない
  }
}
