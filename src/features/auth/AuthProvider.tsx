import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { toLoginErrorMessage } from '@/features/auth/authErrors'
import {
  AuthContext,
  type AuthContextValue,
  type ClinicMember,
} from '@/features/auth/authContext'
import {
  evaluatePlatformAdminMfaGate,
  fetchIsPlatformAdmin,
  type PlatformMfaGate,
} from '@/features/auth/platformMfaGate'
import { clearAuthPresence } from '@/features/auth/authPresence'
import {
  assertAuthIpAllowed,
  recordAuthAuditEvent,
} from '@/features/auth/recordAuthAudit'
import { signOutSession } from '@/features/auth/signOutSession'
import { useAuthPresenceHeartbeat } from '@/features/auth/useAuthPresenceHeartbeat'

async function fetchMemberships(userId: string): Promise<ClinicMember[]> {
  const { data, error } = await supabase
    .from('clinic_members')
    .select(
      'id, clinic_id, user_id, role, status, started_at, ended_at, created_at, updated_at, created_by, updated_by, deleted_at, deleted_by, version, metadata, clinics(id, name, code, is_active)',
    )
    .eq('user_id', userId)
    .eq('status', 'active')
    .is('deleted_at', null)

  if (error) {
    console.error(error)
    return []
  }

  return (data ?? []) as ClinicMember[]
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [memberships, setMemberships] = useState<ClinicMember[]>([])
  /** 初回は true。未解決のまま clinics=[] で「未所属」と誤判定しない */
  const [membershipsLoading, setMembershipsLoading] = useState(true)
  const [mfaGate, setMfaGate] = useState<PlatformMfaGate>({ status: 'ok' })
  const [mfaGateLoading, setMfaGateLoading] = useState(true)

  const refreshMemberships = useCallback(async () => {
    if (!user) {
      setMemberships([])
      setMembershipsLoading(false)
      return
    }
    setMembershipsLoading(true)
    try {
      const rows = await fetchMemberships(user.id)
      setMemberships(rows)
    } finally {
      setMembershipsLoading(false)
    }
  }, [user])

  const refreshMfaGate = useCallback(async () => {
    if (!user) {
      setMfaGate({ status: 'ok' })
      setMfaGateLoading(false)
      return
    }
    setMfaGateLoading(true)
    try {
      const isPlatformAdmin = await fetchIsPlatformAdmin(supabase)
      const nextGate = await evaluatePlatformAdminMfaGate(supabase, isPlatformAdmin)
      setMfaGate(nextGate)
    } finally {
      setMfaGateLoading(false)
    }
  }, [user])

  useEffect(() => {
    let mounted = true

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    void refreshMemberships()
  }, [refreshMemberships])

  useEffect(() => {
    void refreshMfaGate()
  }, [refreshMfaGate])

  // ログイン中は20秒ごとに在席ハートビート（タブ非表示中は停止）
  useAuthPresenceHeartbeat(Boolean(user))

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) {
      return { errorMessage: toLoginErrorMessage(error) }
    }

    const ipGate = await assertAuthIpAllowed()
    if (!ipGate.allowed) {
      await signOutSession(supabase)
      setSession(null)
      setUser(null)
      setMemberships([])
      setMfaGate({ status: 'ok' })
      setMfaGateLoading(false)
      return { errorMessage: ipGate.errorMessage }
    }

    const isPlatformAdmin = await fetchIsPlatformAdmin(supabase)
    const nextGate = await evaluatePlatformAdminMfaGate(supabase, isPlatformAdmin)
    setMfaGate(nextGate)
    setMfaGateLoading(false)

    if (nextGate.status === 'ok') {
      await recordAuthAuditEvent('login_success')
    }

    return { errorMessage: null }
  }, [])

  const signOut = useCallback(async () => {
    if (user) {
      void recordAuthAuditEvent('logout')
      void clearAuthPresence()
    }
    await signOutSession(supabase)
    setSession(null)
    setUser(null)
    setMemberships([])
    setMfaGate({ status: 'ok' })
    setMfaGateLoading(false)
  }, [user])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      memberships,
      membershipsLoading,
      mfaGate,
      mfaGateLoading,
      signIn,
      signOut,
      refreshMemberships,
      refreshMfaGate,
    }),
    [
      user,
      session,
      loading,
      memberships,
      membershipsLoading,
      mfaGate,
      mfaGateLoading,
      signIn,
      signOut,
      refreshMemberships,
      refreshMfaGate,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
