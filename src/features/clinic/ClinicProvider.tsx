import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '@/features/auth/useAuth'
import { ClinicContext, type Clinic } from '@/features/clinic/clinicContext'
import { supabase } from '@/lib/supabase'

const STORAGE_KEY = 'dentacle.activeClinicId'

async function fetchAllClinics(): Promise<Clinic[]> {
  const { data, error } = await supabase
    .from('clinics')
    .select('id, name, code, is_active')
    .is('deleted_at', null)
    .order('name', { ascending: true })

  if (error) {
    console.error(error)
    return []
  }
  return data ?? []
}

export function ClinicProvider({ children }: { children: ReactNode }) {
  const { memberships, membershipsLoading, refreshMemberships, user, loading: authLoading } =
    useAuth()
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const [platformClinics, setPlatformClinics] = useState<Clinic[]>([])
  const [platformAccessReady, setPlatformAccessReady] = useState(false)
  const [clinicId, setClinicIdState] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY)
  })

  const membershipClinics = useMemo<Clinic[]>(() => {
    const map = new Map<string, Clinic>()
    for (const member of memberships) {
      if (!member.clinics) continue
      map.set(member.clinics.id, {
        id: member.clinics.id,
        name: member.clinics.name,
        code: member.clinics.code,
        is_active: member.clinics.is_active,
      })
    }
    return [...map.values()]
  }, [memberships])

  const clinics = isPlatformAdmin ? platformClinics : membershipClinics

  const clinicReady =
    !authLoading && !membershipsLoading && (user ? platformAccessReady : true)

  const refreshPlatformAccess = useCallback(async () => {
    if (!user) {
      setIsPlatformAdmin(false)
      setPlatformClinics([])
      setPlatformAccessReady(true)
      return
    }

    setPlatformAccessReady(false)
    const { data, error } = await supabase.rpc('is_platform_admin')
    if (error || !data) {
      setIsPlatformAdmin(false)
      setPlatformClinics([])
      setPlatformAccessReady(true)
      return
    }

    setIsPlatformAdmin(true)
    setPlatformClinics(await fetchAllClinics())
    setPlatformAccessReady(true)
  }, [user])

  const refreshAuthMemberships = useCallback(async () => {
    await refreshMemberships()
    await refreshPlatformAccess()
  }, [refreshMemberships, refreshPlatformAccess])

  useEffect(() => {
    void refreshPlatformAccess()
  }, [refreshPlatformAccess])

  useEffect(() => {
    // 読込中に clinics が空でも clinicId を消さない（リロードで未所属誤表示の原因）
    if (!clinicReady) return

    if (clinics.length === 0) {
      setClinicIdState(null)
      return
    }
    if (!clinicId || !clinics.some((clinic) => clinic.id === clinicId)) {
      setClinicIdState(clinics[0].id)
    }
  }, [clinics, clinicId, clinicReady])

  useEffect(() => {
    if (!clinicReady) return
    if (clinicId) localStorage.setItem(STORAGE_KEY, clinicId)
    else localStorage.removeItem(STORAGE_KEY)
  }, [clinicId, clinicReady])

  const membership = memberships.find((item) => item.clinic_id === clinicId) ?? null
  const clinic = clinics.find((item) => item.id === clinicId) ?? null
  const isAdmin =
    isPlatformAdmin || membership?.role === 'owner' || membership?.role === 'admin'
  const canWriteOperations =
    isPlatformAdmin ||
    (!!membership && ['owner', 'admin', 'coordinator', 'call'].includes(membership.role))

  const value = useMemo(
    () => ({
      clinic,
      membership,
      clinics,
      setClinicId: (nextId: string) => setClinicIdState(nextId),
      isAdmin,
      canWriteOperations,
      isPlatformAdmin,
      canSwitchClinics: isPlatformAdmin,
      clinicReady,
      refreshAuthMemberships,
    }),
    [
      clinic,
      membership,
      clinics,
      isAdmin,
      canWriteOperations,
      isPlatformAdmin,
      clinicReady,
      refreshAuthMemberships,
    ],
  )

  return <ClinicContext.Provider value={value}>{children}</ClinicContext.Provider>
}
