import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { PlatformMfaGate } from '@/features/auth/platformMfaGate'
import type { Database } from '@/types/database.types'

export type ClinicMember = Database['public']['Tables']['clinic_members']['Row'] & {
  clinics: Pick<
    Database['public']['Tables']['clinics']['Row'],
    'id' | 'name' | 'code' | 'is_active'
  > | null
}

export type AuthContextValue = {
  user: User | null
  session: Session | null
  loading: boolean
  memberships: ClinicMember[]
  membershipsLoading: boolean
  /** 運営向け MFA ゲート（一般ユーザーは常に ok） */
  mfaGate: PlatformMfaGate
  mfaGateLoading: boolean
  signIn: (email: string, password: string) => Promise<{ errorMessage: string | null }>
  signOut: () => Promise<void>
  refreshMemberships: () => Promise<void>
  refreshMfaGate: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
