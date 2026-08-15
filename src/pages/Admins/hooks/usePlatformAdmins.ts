import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { invitePlatformAdminByEmail } from '@/pages/Admins/invitePlatformAdminClient'
import { toPlatformAdminPublicError } from '@/pages/Admins/platformAdminPolicy'
import type { PlatformAdminView } from '@/pages/Admins/platformAdminTypes'

function toView(row: {
  user_id: string
  email: string | null
  display_name: string | null
  note: string | null
  created_at: string
}): PlatformAdminView {
  return {
    userId: row.user_id,
    email: row.email,
    displayName: row.display_name,
    note: row.note,
    createdAt: row.created_at,
  }
}

export function usePlatformAdmins() {
  const [items, setItems] = useState<PlatformAdminView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: rpcError } = await supabase.rpc('list_platform_admins')
    if (rpcError) {
      setItems([])
      setError(
        toPlatformAdminPublicError(rpcError.message, '運営の読み込みに失敗しました。'),
      )
      setLoading(false)
      return
    }
    setItems((data ?? []).map(toView))
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const grant = useCallback(
    async (email: string) => {
      setBusyId('grant')
      const result = await invitePlatformAdminByEmail(email)
      setBusyId(null)
      if (!result.ok) {
        return {
          ok: false as const,
          message: toPlatformAdminPublicError(result.message, '運営の招待に失敗しました。'),
        }
      }
      await refresh()
      return { ok: true as const, invited: result.invited }
    },
    [refresh],
  )

  const update = useCallback(
    async (userId: string, displayName: string, note: string) => {
      setBusyId(userId)
      const { error: rpcError } = await supabase.rpc('update_platform_admin', {
        p_user_id: userId,
        p_display_name: displayName,
        p_note: note,
      })
      setBusyId(null)
      if (rpcError) {
        return {
          ok: false as const,
          message: toPlatformAdminPublicError(rpcError.message, '運営の保存に失敗しました。'),
        }
      }
      await refresh()
      return { ok: true as const }
    },
    [refresh],
  )

  const revoke = useCallback(
    async (userId: string) => {
      setBusyId(userId)
      const { error: rpcError } = await supabase.rpc('revoke_platform_admin', {
        p_user_id: userId,
      })
      setBusyId(null)
      if (rpcError) {
        return {
          ok: false as const,
          message: toPlatformAdminPublicError(rpcError.message, '運営の削除に失敗しました。'),
        }
      }
      await refresh()
      return { ok: true as const }
    },
    [refresh],
  )

  return { items, loading, error, busyId, grant, update, revoke, refresh }
}
