import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/useAuth'

/** デンタクル運営（platform_admins）かどうか */
export function usePlatformAdmin() {
  const { user } = useAuth()
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!user) {
        if (!cancelled) {
          setIsPlatformAdmin(false)
          setLoading(false)
        }
        return
      }

      setLoading(true)
      const { data, error } = await supabase.rpc('is_platform_admin')
      if (cancelled) return
      if (error) {
        setIsPlatformAdmin(false)
      } else {
        setIsPlatformAdmin(Boolean(data))
      }
      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [user])

  return { isPlatformAdmin, loading }
}
