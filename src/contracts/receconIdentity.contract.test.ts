import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  RECECON_FORBIDDEN_PATIENT_KEYS,
  RECECON_PATIENT_MATCH_KEYS,
  hasRececonPatientIdentity,
  matchRececonPatient,
  pickRececonPatientIdentity,
} from './receconIdentity.contract.ts'

const clinicId = 'clinic-1'

describe('receconIdentity.contract', () => {
  it('患者突合は外部患者IDをカルテ番号より優先し、氏名だけでは突合しない', () => {
    assert.deepEqual(RECECON_PATIENT_MATCH_KEYS, ['externalId', 'chartNumber'])

    const existing = [
      { id: 'p-ext', chartNumber: '2002', externalId: 'nh-1' },
      { id: 'p-chart', chartNumber: '1001', externalId: null },
    ]

    assert.deepEqual(
      matchRececonPatient(
        pickRececonPatientIdentity({
          clinicId,
          externalId: 'nh-1',
          chartNumber: '1001',
        }),
        existing,
      ),
      {
        kind: 'conflict',
        reason: 'external_id_and_chart_number_point_to_different_patients',
      },
    )

    assert.deepEqual(
      matchRececonPatient(
        pickRececonPatientIdentity({ clinicId, externalId: 'nh-1', chartNumber: '2002' }),
        existing,
      ),
      { kind: 'external_id', id: 'p-ext' },
    )

    assert.deepEqual(
      matchRececonPatient(
        pickRececonPatientIdentity({ clinicId, chartNumber: '1001' }),
        existing,
      ),
      { kind: 'chart_number', id: 'p-chart' },
    )

    assert.deepEqual(
      matchRececonPatient(
        pickRececonPatientIdentity({ clinicId, nameKanji: '山田 太郎' }),
        existing,
      ),
      { kind: 'invalid' },
    )

    assert.deepEqual(
      matchRececonPatient(
        pickRececonPatientIdentity({ clinicId, chartNumber: '  ' }),
        existing,
      ),
      { kind: 'invalid' },
    )

    assert.deepEqual(
      matchRececonPatient(
        pickRececonPatientIdentity({ clinicId, chartNumber: '9999' }),
        existing,
      ),
      { kind: 'none' },
    )
  })

  it('レセプト伝票IDは患者キーとして採用しない', () => {
    const identity = pickRececonPatientIdentity({
      clinicId,
      receiptId: 'R-2026-08-0001',
      rezeptId: '9999',
      chartNumber: '1001',
    })

    assert.equal(identity.chartNumber, '1001')
    assert.equal(identity.externalId, null)
    assert.equal(hasRececonPatientIdentity(identity), true)
    assert.ok(RECECON_FORBIDDEN_PATIENT_KEYS.includes('receiptId'))
    assert.ok(RECECON_FORBIDDEN_PATIENT_KEYS.includes('レセプト番号'))
  })

  it('CSV取込は身元契約の突合を使い、chart_number直書きに戻さない', () => {
    const dir = dirname(fileURLToPath(import.meta.url))
    const findSource = readFileSync(join(dir, '../features/patientImport/findRececonPatient.ts'), 'utf8')
    const importSource = readFileSync(join(dir, '../features/patientImport/importPatientCsv.ts'), 'utf8')
    assert.match(findSource, /matchRececonPatient/)
    assert.match(findSource, /pickRececonPatientIdentity/)
    assert.match(findSource, /external_id/)
    assert.match(importSource, /findRececonPatientMatch/)
    assert.equal(importSource.includes(".eq('chart_number', patient.chartNumber)"), false)
  })
})
