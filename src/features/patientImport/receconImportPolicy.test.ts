import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'
import {
  RECECON_IMPORT_ACTION,
  RECECON_IMPORT_AUDIT_KEYS,
  RECECON_IMPORT_ENTITY,
  RECECON_IMPORT_PAGE_AUDIT_NOTE,
  RECECON_IMPORT_SOURCE,
  buildRececonImportAuditPayload,
  formatRececonImportAllowedColumnsLabel,
  isRececonImportAuditPayload,
  receconImportAuditHasForbiddenKeys,
} from './receconImportPolicy.ts'

describe('receconImportPolicy', () => {
  it('監査payloadは件数と成否だけを持ち、個人情報キーを含めない', () => {
    const payload = buildRececonImportAuditPayload({
      parsedCount: 12,
      staffUpserted: 3,
      patientsInserted: 8,
      patientsUpdated: 4,
      conditionsUpserted: 12,
      errorCount: 0,
      outcome: 'success',
    })

    assert.equal(payload.source, RECECON_IMPORT_SOURCE)
    assert.equal(payload.outcome, 'success')
    assert.equal(payload.count, 12)
    assert.deepEqual(Object.keys(payload).sort(), [...RECECON_IMPORT_AUDIT_KEYS].sort())
    assert.equal(isRececonImportAuditPayload(payload), true)
    assert.equal(receconImportAuditHasForbiddenKeys(payload), false)
  })

  it('一部エラーと失敗でも氏名・カルテ番号・ファイル名・エラー本文を載せない', () => {
    const partial = buildRececonImportAuditPayload({
      parsedCount: 10,
      staffUpserted: 1,
      patientsInserted: 7,
      patientsUpdated: 2,
      conditionsUpserted: 9,
      errorCount: 1,
      outcome: 'partial',
    })
    const failed = buildRececonImportAuditPayload({
      parsedCount: 10,
      staffUpserted: 0,
      patientsInserted: 0,
      patientsUpdated: 0,
      conditionsUpserted: 0,
      errorCount: 1,
      outcome: 'failed',
    })

    for (const payload of [partial, failed]) {
      assert.equal('nameKanji' in payload, false)
      assert.equal('chartNumber' in payload, false)
      assert.equal('fileName' in payload, false)
      assert.equal('errors' in payload, false)
      assert.equal('message' in payload, false)
      assert.equal(isRececonImportAuditPayload(payload), true)
    }
  })

  it('個人情報キーが混ざったpayloadは監査として拒否する', () => {
    const dirty = {
      source: RECECON_IMPORT_SOURCE,
      outcome: 'success',
      parsedCount: 1,
      staffUpserted: 0,
      patientsInserted: 1,
      patientsUpdated: 0,
      conditionsUpserted: 1,
      errorCount: 0,
      count: 1,
      nameKanji: '山田 太郎',
      chartNumber: '1001',
    }

    assert.equal(isRececonImportAuditPayload(dirty), false)
    assert.equal(receconImportAuditHasForbiddenKeys(dirty), true)
  })

  it('取込画面は操作ログへ件数監査だけ残し、エラー本文をpayloadに載せない', () => {
    const page = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '../../pages/Import/PatientImportPage.tsx'),
      'utf8',
    )
    const handleImport = page.slice(
      page.indexOf('async function handleImport'),
      page.indexOf('if (!clinicReady)'),
    )
    const auditCalls = [...handleImport.matchAll(/recordAudit\(\{[\s\S]*?\}\)/g)].map(
      (match) => match[0],
    )
    assert.match(handleImport, /writeOperationTrace/)
    assert.match(handleImport, /buildRececonImportAuditPayload/)
    assert.match(handleImport, /RECECON_IMPORT_ACTION/)
    assert.equal(auditCalls.length, 2)
    for (const call of auditCalls) {
      assert.equal(/fileName/.test(call), false)
      assert.equal(/err\.message/.test(call), false)
      assert.equal(/nameKanji/.test(call), false)
      assert.equal(/chartNumber/.test(call), false)
    }
  })

  it('取込画面の説明は種まき列と件数監査だけを書く', () => {
    assert.equal(RECECON_IMPORT_ACTION, 'patient.import_rececon_csv')
    assert.equal(RECECON_IMPORT_ENTITY, 'patient_import')
    assert.match(formatRececonImportAllowedColumnsLabel(), /カルテ番号/)
    assert.match(formatRececonImportAllowedColumnsLabel(), /氏名/)
    assert.match(RECECON_IMPORT_PAGE_AUDIT_NOTE, /操作ログ/)
    assert.match(RECECON_IMPORT_PAGE_AUDIT_NOTE, /件数/)
    assert.equal(/Datadog/.test(RECECON_IMPORT_PAGE_AUDIT_NOTE), false)
  })
})
