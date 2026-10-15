import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  PATIENT_DOCUMENT_MAX_BYTES,
  PATIENT_DOCUMENT_MAX_COUNT,
  buildPatientDocumentPath,
  formatDocumentBytes,
  isPatientDocumentStoragePath,
  isPdfMagic,
  partitionPatientPdfs,
  patientDocumentFileName,
  validatePatientPdfMeta,
} from './patientDocumentPolicy.ts'

const PDF_HEADER = [0x25, 0x50, 0x44, 0x46, 0x2d]
const CLINIC_ID = '11111111-1111-4111-8111-111111111111'
const PATIENT_ID = '22222222-2222-4222-8222-222222222222'
const DOCUMENT_ID = '33333333-3333-4333-8333-333333333333'

function fileBytes(bytes: readonly number[]): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.length)
  const view = new Uint8Array(buffer)
  bytes.forEach((byte, index) => {
    view[index] = byte
  })
  return buffer
}

function pdfFile(
  name: string,
  bytes: readonly number[] = PDF_HEADER,
  type = 'application/pdf',
): File {
  return new File([fileBytes(bytes)], name, { type })
}

describe('患者PDFの受付', () => {
  it('拡張子がPDFで中身がPDFのファイルは受け付ける', () => {
    const result = validatePatientPdfMeta({
      name: '紹介状.pdf',
      type: 'application/pdf',
      size: 1200,
      existingCount: 0,
    })
    assert.equal(result.ok, true)
    if (result.ok) assert.equal(result.fileName, '紹介状.pdf')
  })

  it('パス付きの名前はファイル名だけを残す', () => {
    assert.equal(patientDocumentFileName('C:\\fakepath\\同意書.pdf'), '同意書.pdf')
    assert.equal(patientDocumentFileName('../同意書.pdf'), '同意書.pdf')
  })

  it('PDF以外の拡張子は受け付けない', () => {
    const result = validatePatientPdfMeta({
      name: '写真.png',
      type: 'image/png',
      size: 1200,
      existingCount: 0,
    })
    assert.deepEqual(result, { ok: false, message: 'PDFファイルのみアップロードできます。' })
  })

  it('空ファイルと10MB超過は受け付けない', () => {
    assert.equal(
      validatePatientPdfMeta({
        name: '空.pdf',
        type: 'application/pdf',
        size: 0,
        existingCount: 0,
      }).ok,
      false,
    )
    const oversized = validatePatientPdfMeta({
      name: '大きい.pdf',
      type: 'application/pdf',
      size: PATIENT_DOCUMENT_MAX_BYTES + 1,
      existingCount: 0,
    })
    assert.deepEqual(oversized, { ok: false, message: 'ファイルサイズは10MB以内にしてください。' })
  })

  it('21件目は受け付けない', () => {
    const result = validatePatientPdfMeta({
      name: '追加.pdf',
      type: 'application/pdf',
      size: 10,
      existingCount: PATIENT_DOCUMENT_MAX_COUNT,
    })
    assert.deepEqual(result, { ok: false, message: '書類は患者あたり20件までです。' })
  })

  it('拡張子がPDFでも中身が画像なら分けて落とす', async () => {
    const png = pdfFile('偽.pdf', [0x89, 0x50, 0x4e, 0x47])
    const pdf = pdfFile('紹介状.pdf')
    const result = await partitionPatientPdfs({ existingCount: 0, incoming: [png, pdf] })
    assert.equal(result.accepted.length, 1)
    assert.equal(result.accepted[0]?.name, '紹介状.pdf')
    assert.match(result.message ?? '', /偽\.pdf/)
  })

  it('PDFマジックは %PDF- のみ', () => {
    assert.equal(isPdfMagic(new Uint8Array(fileBytes(PDF_HEADER))), true)
    assert.equal(isPdfMagic(new Uint8Array(fileBytes([0x25, 0x50, 0x44, 0x46]))), false)
  })
})

describe('保存パス', () => {
  it('クリニック・患者・書類IDからPDFパスを作る', () => {
    const path = buildPatientDocumentPath(CLINIC_ID, PATIENT_ID, DOCUMENT_ID)
    assert.equal(path, `${CLINIC_ID}/${PATIENT_ID}/${DOCUMENT_ID}.pdf`)
    assert.equal(isPatientDocumentStoragePath(path ?? '', CLINIC_ID), true)
  })

  it('他クリニックのパスや適当な文字列は拒否する', () => {
    const foreign = `${PATIENT_ID}/${PATIENT_ID}/${DOCUMENT_ID}.pdf`
    assert.equal(isPatientDocumentStoragePath(foreign, CLINIC_ID), false)
    assert.equal(buildPatientDocumentPath('clinic', PATIENT_ID, DOCUMENT_ID), null)
    assert.equal(isPatientDocumentStoragePath(`${CLINIC_ID}/secret.pdf`, CLINIC_ID), false)
  })
})

describe('表示サイズ', () => {
  it('バイト・KB・MBを分ける', () => {
    assert.equal(formatDocumentBytes(512), '512 B')
    assert.equal(formatDocumentBytes(2048), '2 KB')
    assert.equal(formatDocumentBytes(PATIENT_DOCUMENT_MAX_BYTES), '10 MB')
  })
})
