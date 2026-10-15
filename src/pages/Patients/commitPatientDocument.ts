import {
  buildPatientDocumentPath,
  isPatientDocumentStoragePath,
  isPdfMagic,
  readBlobPrefix,
  validatePatientPdfMeta,
} from './patientDocumentPolicy.ts'

export type PatientDocumentGateway = {
  uploadObject: (path: string, body: Blob) => Promise<string | null>
  removeObject: (path: string) => Promise<string | null>
  insertDocument: (row: {
    id: string
    clinicId: string
    patientId: string
    storagePath: string
    fileName: string
    byteSize: number
    uploadedBy: string | null
  }) => Promise<string | null>
  softDeleteDocument: (id: string, clinicId: string) => Promise<string | null>
}

export async function savePatientPdf(
  gateway: Pick<PatientDocumentGateway, 'uploadObject' | 'removeObject' | 'insertDocument'>,
  input: {
    clinicId: string
    patientId: string
    file: Blob
    fileName: string
    mimeType: string
    byteSize: number
    uploadedBy: string | null
    existingCount: number
    createId?: () => string
  },
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const meta = validatePatientPdfMeta({
    name: input.fileName,
    type: input.mimeType,
    size: input.byteSize,
    existingCount: input.existingCount,
  })
  if (!meta.ok) return meta

  const header = await readBlobPrefix(input.file)
  if (!isPdfMagic(header)) {
    return { ok: false, message: 'PDFファイルのみアップロードできます。' }
  }

  const id = (input.createId ?? crypto.randomUUID)()
  const storagePath = buildPatientDocumentPath(input.clinicId, input.patientId, id)
  if (!storagePath) {
    return { ok: false, message: '保存先を確定できませんでした。' }
  }

  const uploadError = await gateway.uploadObject(storagePath, input.file)
  if (uploadError) return { ok: false, message: uploadError }

  const insertError = await gateway.insertDocument({
    id,
    clinicId: input.clinicId,
    patientId: input.patientId,
    storagePath,
    fileName: meta.fileName,
    byteSize: input.byteSize,
    uploadedBy: input.uploadedBy,
  })
  if (insertError) {
    await gateway.removeObject(storagePath)
    return { ok: false, message: insertError }
  }

  return { ok: true, id }
}

export async function removePatientPdf(
  gateway: Pick<PatientDocumentGateway, 'removeObject' | 'softDeleteDocument'>,
  input: { id: string; clinicId: string; storagePath: string },
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isPatientDocumentStoragePath(input.storagePath, input.clinicId)) {
    return { ok: false, message: '書類の保存先が不正です。' }
  }

  const removeError = await gateway.removeObject(input.storagePath)
  if (removeError) return { ok: false, message: removeError }

  const deleteError = await gateway.softDeleteDocument(input.id, input.clinicId)
  if (deleteError) {
    return {
      ok: false,
      message: 'ファイルは削除しましたが、一覧の更新に失敗しました。もう一度削除してください。',
    }
  }

  return { ok: true }
}
