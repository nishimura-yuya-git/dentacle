import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database.types'

export type ContractorProfile = Tables<'clinic_contractor_profiles'>

export type ContractorProfileDraft = {
  corporate_name: string
  representative_name: string
  postal_code: string
  prefecture: string
  address: string
  phone: string
  login_email: string
  invoice_email: string
}

export type SaveContractorResult =
  | { ok: true; profile: ContractorProfile }
  | { ok: false; message: string }

const EMPTY_DRAFT: ContractorProfileDraft = {
  corporate_name: '',
  representative_name: '',
  postal_code: '',
  prefecture: '',
  address: '',
  phone: '',
  login_email: '',
  invoice_email: '',
}

export function profileToDraft(profile: ContractorProfile | null): ContractorProfileDraft {
  if (!profile) return { ...EMPTY_DRAFT }
  return {
    corporate_name: profile.corporate_name ?? '',
    representative_name: profile.representative_name ?? '',
    postal_code: profile.postal_code ?? '',
    prefecture: profile.prefecture ?? '',
    address: profile.address ?? '',
    phone: profile.phone ?? '',
    login_email: profile.login_email ?? '',
    invoice_email: profile.invoice_email ?? '',
  }
}

function toNullable(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function toPublicSaveError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('row-level security') || lower.includes('permission denied')) {
    return '契約者情報を保存する権限がありません。運営アカウントでログインしてください。'
  }
  return '契約者情報の保存に失敗しました。時間をおいて再度お試しください。'
}

export function useContractorProfile(clinicId: string | undefined) {
  const [profile, setProfile] = useState<ContractorProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!clinicId) {
      setProfile(null)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    const { data, error: queryError } = await supabase
      .from('clinic_contractor_profiles')
      .select('*')
      .eq('clinic_id', clinicId)
      .maybeSingle()

    if (queryError) {
      setError(queryError.message)
      setProfile(null)
    } else {
      setProfile(data)
    }
    setLoading(false)
  }, [clinicId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const saveProfile = useCallback(
    async (draft: ContractorProfileDraft): Promise<SaveContractorResult> => {
      if (!clinicId) {
        return { ok: false, message: 'クリニックが選択されていません。' }
      }

      setSaving(true)
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        const payload = {
          clinic_id: clinicId,
          corporate_name: toNullable(draft.corporate_name),
          representative_name: toNullable(draft.representative_name),
          postal_code: toNullable(draft.postal_code),
          prefecture: toNullable(draft.prefecture),
          address: toNullable(draft.address),
          phone: toNullable(draft.phone),
          login_email: toNullable(draft.login_email),
          invoice_email: toNullable(draft.invoice_email),
          updated_by: user?.id ?? null,
          updated_at: new Date().toISOString(),
          created_by: profile?.created_by ?? user?.id ?? null,
        }

        const { data, error: upsertError } = await supabase
          .from('clinic_contractor_profiles')
          .upsert(payload, { onConflict: 'clinic_id' })
          .select('*')
          .single()

        if (upsertError || !data) {
          console.error(upsertError)
          return {
            ok: false,
            message: toPublicSaveError(upsertError?.message ?? ''),
          }
        }

        setProfile(data)
        return { ok: true, profile: data }
      } finally {
        setSaving(false)
      }
    },
    [clinicId, profile?.created_by],
  )

  return { profile, loading, saving, error, refresh, saveProfile }
}
