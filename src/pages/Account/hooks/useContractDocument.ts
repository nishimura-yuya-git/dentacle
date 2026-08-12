import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database.types'

export type ContractDocument = Tables<'clinic_contract_documents'>

const BUCKET = 'clinic-contracts'
const SIGNED_URL_TTL_SEC = 60 * 60

export function useContractDocument(clinicId: string | undefined) {
  const [document, setDocument] = useState<ContractDocument | null>(null)
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const refresh = useCallback(async () => {
    if (!clinicId) {
      setDocument(null)
      setSignedUrl(null)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: queryError } = await supabase
      .from('clinic_contract_documents')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('is_active', true)
      .maybeSingle()

    if (queryError) {
      setError(queryError.message)
      setDocument(null)
      setSignedUrl(null)
      setLoading(false)
      return
    }

    setDocument(data)
    if (!data) {
      setSignedUrl(null)
      setLoading(false)
      return
    }

    const { data: signed, error: signError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(data.storage_path, SIGNED_URL_TTL_SEC)

    if (signError) {
      setError(signError.message)
      setSignedUrl(null)
    } else {
      setSignedUrl(signed.signedUrl)
    }
    setLoading(false)
  }, [clinicId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const uploadPdf = useCallback(
    async (file: File) => {
      if (!clinicId) {
        return { ok: false as const, message: 'クリニックが選択されていません。' }
      }
      if (file.type !== 'application/pdf') {
        return { ok: false as const, message: 'PDFファイルのみアップロードできます。' }
      }
      if (file.size > 10 * 1024 * 1024) {
        return { ok: false as const, message: 'ファイルサイズは10MB以内にしてください。' }
      }

      setUploading(true)
      setError(null)

      const documentId = crypto.randomUUID()
      const storagePath = `${clinicId}/${documentId}.pdf`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, {
          contentType: 'application/pdf',
          upsert: false,
        })

      if (uploadError) {
        setUploading(false)
        setError(uploadError.message)
        return { ok: false as const, message: uploadError.message }
      }

      const { error: deactivateError } = await supabase
        .from('clinic_contract_documents')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('clinic_id', clinicId)
        .eq('is_active', true)

      if (deactivateError) {
        await supabase.storage.from(BUCKET).remove([storagePath])
        setUploading(false)
        setError(deactivateError.message)
        return { ok: false as const, message: deactivateError.message }
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { error: insertError } = await supabase.from('clinic_contract_documents').insert({
        id: documentId,
        clinic_id: clinicId,
        storage_path: storagePath,
        file_name: file.name,
        content_type: 'application/pdf',
        byte_size: file.size,
        is_active: true,
        uploaded_by: user?.id ?? null,
      })

      if (insertError) {
        await supabase.storage.from(BUCKET).remove([storagePath])
        setUploading(false)
        setError(insertError.message)
        return { ok: false as const, message: insertError.message }
      }

      await refresh()
      setUploading(false)
      return { ok: true as const }
    },
    [clinicId, refresh],
  )

  return {
    document,
    signedUrl,
    loading,
    error,
    uploading,
    refresh,
    uploadPdf,
  }
}
