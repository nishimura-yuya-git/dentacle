import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { fallbackPatientIconId } from '../Patients/patientIconPolicy.ts'
import { toContactRow } from './mapContactRow.ts'

const base = {
  id: 'pc-1',
  status: 'pending',
  result_note: null,
  contacted_at: null,
  visit_id: 'v-1',
  patient_id: 'patient-abc',
  visits: null,
}

describe('toContactRow', () => {
  it('保存済み user_icon を使う', () => {
    const row = toContactRow({
      ...base,
      patients: {
        name_kanji: '山田',
        name_kana: null,
        chart_number: '1',
        phone: null,
        area_label: null,
        has_infectious_disease: true,
        metadata: { user_icon: '4', visit_count: 3 },
      },
    })
    assert.equal(row.icon_id, '4')
    assert.equal(row.patients?.name_kanji, '山田')
    assert.equal(row.patients?.has_infectious_disease, true)
  })

  it('未設定は患者IDの安定ハッシュ', () => {
    const row = toContactRow({
      ...base,
      patients: {
        name_kanji: '山田',
        name_kana: null,
        chart_number: null,
        phone: null,
        area_label: null,
        metadata: {},
      },
    })
    assert.equal(row.icon_id, fallbackPatientIconId('patient-abc'))
    assert.equal(row.patients?.has_infectious_disease, false)
  })
})
