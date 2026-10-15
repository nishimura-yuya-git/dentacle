/** 患者書類PDFの受付ルール。契約PDFと同じく 10MB・PDF のみ。件数は患者あたり 20。 */

export const PATIENT_DOCUMENTS_BUCKET = 'patient-documents'
export const PATIENT_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024
export const PATIENT_DOCUMENT_MAX_COUNT = 20

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d] as const
const UUID_PATTERN =
  '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const STORAGE_PATH_PATTERN = new RegExp(
  `^(${UUID_PATTERN})/(${UUID_PATTERN})/(${UUID_PATTERN})\\.pdf$`,
  'i',
)
const ALLOWED_MIME_TYPES = new Set([
  '',
  'application/pdf',
  'application/x-pdf',
  'application/octet-stream',
])

export function patientDocumentFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? ''
  return base.trim()
}

export function validatePatientPdfMeta(input: {
  name: string
  type: string
  size: number
  existingCount: number
}): { ok: true; fileName: string } | { ok: false; message: string } {
  const fileName = patientDocumentFileName(input.name)
  if (!fileName) {
    return { ok: false, message: 'ファイル名を確認してください。' }
  }
  if (fileName.length > 200) {
    return { ok: false, message: 'ファイル名は200文字以内にしてください。' }
  }
  if (!fileName.toLowerCase().endsWith('.pdf')) {
    return { ok: false, message: 'PDFファイルのみアップロードできます。' }
  }
  if (!ALLOWED_MIME_TYPES.has(input.type.trim().toLowerCase())) {
    return { ok: false, message: 'PDFファイルのみアップロードできます。' }
  }
  if (!Number.isFinite(input.size) || input.size <= 0) {
    return { ok: false, message: 'ファイルが空です。' }
  }
  if (input.size > PATIENT_DOCUMENT_MAX_BYTES) {
    return { ok: false, message: 'ファイルサイズは10MB以内にしてください。' }
  }
  if (input.existingCount >= PATIENT_DOCUMENT_MAX_COUNT) {
    return { ok: false, message: '書類は患者あたり20件までです。' }
  }
  return { ok: true, fileName }
}

export async function readBlobPrefix(file: Blob, length = 5): Promise<Uint8Array> {
  const buffer = await file.slice(0, length).arrayBuffer()
  return new Uint8Array(buffer)
}

export function isPdfMagic(prefix: Uint8Array): boolean {
  return PDF_MAGIC.every((byte, index) => prefix[index] === byte)
}

export async function partitionPatientPdfs(input: {
  existingCount: number
  incoming: File[]
}): Promise<{ accepted: File[]; message: string | null }> {
  const accepted: File[] = []
  const rejected: string[] = []
  let count = input.existingCount

  for (const file of input.incoming) {
    const meta = validatePatientPdfMeta({
      name: file.name,
      type: file.type,
      size: file.size,
      existingCount: count,
    })
    const label = patientDocumentFileName(file.name) || 'ファイル'
    if (!meta.ok) {
      rejected.push(`${label}: ${meta.message}`)
      continue
    }
    const header = await readBlobPrefix(file)
    if (!isPdfMagic(header)) {
      rejected.push(`${label}: PDFファイルのみアップロードできます。`)
      continue
    }
    accepted.push(file)
    count += 1
  }

  return {
    accepted,
    message: rejected.length > 0 ? rejected.join(' ') : null,
  }
}

export function buildPatientDocumentPath(
  clinicId: string,
  patientId: string,
  documentId: string,
): string | null {
  const path = `${clinicId}/${patientId}/${documentId}.pdf`
  if (!isPatientDocumentStoragePath(path, clinicId)) return null
  if (!path.toLowerCase().includes(`/${patientId.toLowerCase()}/`)) return null
  return path
}

export function isPatientDocumentStoragePath(path: string, clinicId?: string): boolean {
  const match = STORAGE_PATH_PATTERN.exec(path)
  if (!match) return false
  if (clinicId && match[1].toLowerCase() !== clinicId.toLowerCase()) return false
  return true
}

export function formatDocumentBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${Math.round(bytes)} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  const megabytes = bytes / (1024 * 1024)
  return `${megabytes.toFixed(megabytes >= 10 ? 0 : 1)} MB`
}
