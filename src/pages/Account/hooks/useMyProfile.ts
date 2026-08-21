import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  toMyProfilePublicError,
  validateDisplayName,
  type DisplayNameDraft,
} from '@/pages/Account/hooks/myProfilePolicy'

export type MyProfile = {
  id: string
  display_name: string | null
}

export type SaveMyProfileResult =
  | { ok: true; profile: MyProfile }
  | { ok: false; message: string; field?: 'displayName' }

export function useMyProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<MyProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!userId) {
      setProfile(null)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    const { data, error: queryError } = await supabase
      .from('profiles')
      .select('id, display_name')
      .eq('id', userId)
      .is('deleted_at', null)
      .maybeSingle()

    if (queryError) {
      console.error(queryError)
      setError('アカウント情報の読み込みに失敗しました。')
      setProfile(null)
    } else {
      setProfile(data)
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const saveProfile = useCallback(
    async (draft: DisplayNameDraft): Promise<SaveMyProfileResult> => {
      const validated = validateDisplayName(draft.displayName)
      if (!validated.ok) {
        return { ok: false, message: validated.message, field: 'displayName' }
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        return { ok: false, message: 'ログインが必要です。' }
      }

      setSaving(true)
      try {
        const { data, error: updateError } = await supabase
          .from('profiles')
          .update({
            display_name: validated.displayName,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id)
          .is('deleted_at', null)
          .select('id, display_name')
          .single()

        if (updateError || !data) {
          console.error(updateError)
          return {
            ok: false,
            message: toMyProfilePublicError(updateError?.message ?? ''),
          }
        }

        setProfile(data)
        return { ok: true, profile: data }
      } finally {
        setSaving(false)
      }
    },
    [],
  )

  return { profile, loading, saving, error, refresh, saveProfile }
}
