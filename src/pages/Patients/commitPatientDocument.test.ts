import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { removePatientPdf, savePatientPdf, type PatientDocumentGateway } from './commitPatientDocument.ts'

const CLINIC_ID = '11111111-1111-4111-8111-111111111111'
const PATIENT_ID = '22222222-2222-4222-8222-222222222222'
const DOCUMENT_ID = '33333333-3333-4333-8333-333333333333'
const PDF_BYTES = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]

function fileBytes(bytes: readonly number[]): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.length)
  const view = new Uint8Array(buffer)
  bytes.forEach((byte, index) => {
    view[index] = byte
  })
  return buffer
}

function pdfFile(name = '紹介状.pdf'): File {
  return new File([fileBytes(PDF_BYTES)], name, { type: 'application/pdf' })
}

function createGateway(overrides: Partial<PatientDocumentGateway> = {}) {
  const calls: string[] = []
  const gateway: PatientDocumentGateway = {
    uploadObject: async (path) => {
      calls.push(`upload:${path}`)
      return null
    },
    removeObject: async (path) => {
      calls.push(`remove:${path}`)
      return null
    },
    insertDocument: async (row) => {
      calls.push(`insert:${row.storagePath}:${row.fileName}`)
      return null
    },
    softDeleteDocument: async (id) => {
      calls.push(`delete:${id}`)
      return null
    },
    ...overrides,
  }
  return { gateway, calls }
}

describe('savePatientPdf', () => {
  it('PDFをストレージへ置いてから台帳へ書く', async () => {
    const { gateway, calls } = createGateway()
    const file = pdfFile()
    const result = await savePatientPdf(gateway, {
      clinicId: CLINIC_ID,
      patientId: PATIENT_ID,
      file,
      fileName: file.name,
      mimeType: file.type,
      byteSize: file.size,
      uploadedBy: 'user-1',
      existingCount: 0,
      createId: () => DOCUMENT_ID,
    })
    assert.deepEqual(result, { ok: true, id: DOCUMENT_ID })
    const path = `${CLINIC_ID}/${PATIENT_ID}/${DOCUMENT_ID}.pdf`
    assert.deepEqual(calls, [`upload:${path}`, `insert:${path}:紹介状.pdf`])
  })

  it('台帳の保存に失敗したらストレージの実体を消す', async () => {
    const { gateway, calls } = createGateway({
      insertDocument: async () => '書類の処理に失敗しました。時間をおいて再度お試しください。',
    })
    const file = pdfFile()
    const result = await savePatientPdf(gateway, {
      clinicId: CLINIC_ID,
      patientId: PATIENT_ID,
      file,
      fileName: file.name,
      mimeType: file.type,
      byteSize: file.size,
      uploadedBy: null,
      existingCount: 0,
      createId: () => DOCUMENT_ID,
    })
    assert.equal(result.ok, false)
    assert.equal(calls.filter((call) => call.startsWith('remove:')).length, 1)
  })

  it('PDFでないファイルはストレージへ送らない', async () => {
    const { gateway, calls } = createGateway()
    const file = new File([fileBytes([0x89, 0x50, 0x4e, 0x47])], '偽.pdf', {
      type: 'application/pdf',
    })
    const result = await savePatientPdf(gateway, {
      clinicId: CLINIC_ID,
      patientId: PATIENT_ID,
      file,
      fileName: file.name,
      mimeType: file.type,
      byteSize: file.size,
      uploadedBy: null,
      existingCount: 0,
    })
    assert.deepEqual(result, { ok: false, message: 'PDFファイルのみアップロードできます。' })
    assert.deepEqual(calls, [])
  })
})

describe('removePatientPdf', () => {
  it('自クリニックのパスだけを消してから論理削除する', async () => {
    const { gateway, calls } = createGateway()
    const storagePath = `${CLINIC_ID}/${PATIENT_ID}/${DOCUMENT_ID}.pdf`
    const result = await removePatientPdf(gateway, {
      id: DOCUMENT_ID,
      clinicId: CLINIC_ID,
      storagePath,
    })
    assert.deepEqual(result, { ok: true })
    assert.deepEqual(calls, [`remove:${storagePath}`, `delete:${DOCUMENT_ID}`])
  })

  it('別クリニックのパスは消さない', async () => {
    const { gateway, calls } = createGateway()
    const result = await removePatientPdf(gateway, {
      id: DOCUMENT_ID,
      clinicId: CLINIC_ID,
      storagePath: `${PATIENT_ID}/${PATIENT_ID}/${DOCUMENT_ID}.pdf`,
    })
    assert.equal(result.ok, false)
    assert.deepEqual(calls, [])
  })
})
