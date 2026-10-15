import { supabase } from '@/lib/supabase'
import {
  removePatientPdf,
  savePatientPdf,
  type PatientDocumentGateway,
} from '@/pages/Patients/commitPatientDocument'
import {
  PATIENT_DOCUMENTS_BUCKET,
  isPatientDocumentStoragePath,
  patientDocumentFileName,
} from '@/pages/Patients/patientDocumentPolicy'

const SIGNED_URL_TTL_SEC = 60 * 60

export type PatientDocumentItem = {
  id: string
  fileName: string
  byteSize: number
  uploadedAt: string
  storagePath: string
}

function toUserMessage(message: string): string {
  if (/patient document limit exceeded/i.test(message)) {
    return '書類は患者あたり20件までです。'
  }
  if (/row-level security|permission denied|42501|403/i.test(message)) {
    return 'この操作の権限がありません。'
  }
  if (/mime|invalid_mime|content type/i.test(message)) {
    return 'PDFファイルのみアップロードできます。'
  }
  if (/payload too large|exceeded the maximum|file size/i.test(message)) {
    return 'ファイルサイズは10MB以内にしてください。'
  }
  if (/not found|object not found/i.test(message)) {
    return '書類が見つかりません。'
  }
  return '書類の処理に失敗しました。時間をおいて再度お試しください。'
}

function createGateway(): PatientDocumentGateway {
  return {
    uploadObject: async (path, body) => {
      const { error } = await supabase.storage.from(PATIENT_DOCUMENTS_BUCKET).upload(path, body, {
        contentType: 'application/pdf',
        upsert: false,
      })
      return error ? toUserMessage(error.message) : null
    },
    removeObject: async (path) => {
      const { error } = await supabase.storage.from(PATIENT_DOCUMENTS_BUCKET).remove([path])
      if (!error) return null
      if (/not found/i.test(error.message)) return null
      return toUserMessage(error.message)
    },
    insertDocument: async (row) => {
      const { error } = await supabase.from('patient_documents').insert({
        id: row.id,
        clinic_id: row.clinicId,
        patient_id: row.patientId,
        storage_path: row.storagePath,
        file_name: row.fileName,
        content_type: 'application/pdf',
        byte_size: row.byteSize,
        uploaded_by: row.uploadedBy,
      })
      return error ? toUserMessage(error.message) : null
    },
    softDeleteDocument: async (id, clinicId) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('patient_documents')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id ?? null,
        })
        .eq('id', id)
        .eq('clinic_id', clinicId)
        .is('deleted_at', null)
      return error ? toUserMessage(error.message) : null
    },
  }
}

export async function listPatientDocuments(
  clinicId: string,
  patientId: string,
): Promise<{ ok: true; documents: PatientDocumentItem[] } | { ok: false; message: string }> {
  const { data, error } = await supabase
    .from('patient_documents')
    .select('id, file_name, byte_size, uploaded_at, storage_path')
    .eq('clinic_id', clinicId)
    .eq('patient_id', patientId)
    .is('deleted_at', null)
    .order('uploaded_at', { ascending: false })

  if (error) return { ok: false, message: toUserMessage(error.message) }

  return {
    ok: true,
    documents: (data ?? []).map((row) => ({
      id: row.id,
      fileName: row.file_name,
      byteSize: row.byte_size,
      uploadedAt: row.uploaded_at,
      storagePath: row.storage_path,
    })),
  }
}

export async function uploadPatientPdf(input: {
  clinicId: string
  patientId: string
  file: File
  existingCount: number
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    return { ok: false, message: 'ログインが必要です。' }
  }

  const result = await savePatientPdf(createGateway(), {
    clinicId: input.clinicId,
    patientId: input.patientId,
    file: input.file,
    fileName: input.file.name,
    mimeType: input.file.type,
    byteSize: input.file.size,
    uploadedBy: user.id,
    existingCount: input.existingCount,
  })
  if (!result.ok) return result
  return { ok: true }
}

export async function uploadPendingPatientPdfs(input: {
  clinicId: string
  patientId: string
  files: File[]
}): Promise<{ failures: string[] }> {
  const failures: string[] = []
  let existingCount = 0
  for (const file of input.files) {
    const result = await uploadPatientPdf({
      clinicId: input.clinicId,
      patientId: input.patientId,
      file,
      existingCount,
    })
    if (!result.ok) {
      const label = patientDocumentFileName(file.name) || 'ファイル'
      failures.push(`${label}: ${result.message}`)
      continue
    }
    existingCount += 1
  }
  return { failures }
}

export async function deletePatientDocument(input: {
  clinicId: string
  document: PatientDocumentItem
}): Promise<{ ok: true } | { ok: false; message: string }> {
  return removePatientPdf(createGateway(), {
    id: input.document.id,
    clinicId: input.clinicId,
    storagePath: input.document.storagePath,
  })
}

export async function createPatientDocumentUrl(
  clinicId: string,
  storagePath: string,
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  if (!isPatientDocumentStoragePath(storagePath, clinicId)) {
    return { ok: false, message: '書類の保存先が不正です。' }
  }
  const { data, error } = await supabase.storage
    .from(PATIENT_DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SEC)
  if (error || !data?.signedUrl) {
    return { ok: false, message: error ? toUserMessage(error.message) : '書類を開けませんでした。' }
  }
  return { ok: true, url: data.signedUrl }
}
