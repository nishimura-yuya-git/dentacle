import { createContext } from 'react'
import type { ClinicMember } from '@/features/auth/authContext'
import type { Database } from '@/types/database.types'

export type Clinic = Pick<
  Database['public']['Tables']['clinics']['Row'],
  'id' | 'name' | 'code' | 'is_active'
>

export type ClinicContextValue = {
  clinic: Clinic | null
  membership: ClinicMember | null
  clinics: Clinic[]
  setClinicId: (clinicId: string) => void
  isAdmin: boolean
  canWriteOperations: boolean
  /** デンタクル運営（スーパー権限）。全クリニック閲覧・切替可 */
  isPlatformAdmin: boolean
  /** ヘッダーのクリニック切替UIを出すか（運営のみ） */
  canSwitchClinics: boolean
  /**
   * 所属・運営権限の初回解決が終わったか。
   * false のあいだは「未所属」カードを出さない（リロード時の誤表示防止）。
   */
  clinicReady: boolean
  refreshAuthMemberships: () => Promise<void>
}

export const ClinicContext = createContext<ClinicContextValue | null>(null)
