import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildRecentJobsClinicFilterOptions,
  filterRecentJobsByClinic,
  shouldShowRecentJobsClinicColumn,
} from './filterRecentJobs.ts'

describe('filterRecentJobs', () => {
  const rows = [
    { id: '1', clinic_id: 'c1', clinicName: 'あおぞら歯科' },
    { id: '2', clinic_id: 'c2', clinicName: 'ひまわり歯科' },
    { id: '3', clinic_id: 'c1', clinicName: 'あおぞら歯科' },
  ]

  it('空文字はすべてのクリニックを返す', () => {
    assert.equal(filterRecentJobsByClinic(rows, '').length, 3)
  })

  it('特定クリニックだけ残す', () => {
    const filtered = filterRecentJobsByClinic(rows, 'c1')
    assert.deepEqual(
      filtered.map((row) => row.id),
      ['1', '3'],
    )
  })

  it('クリニック Select オプションを名前順で作る', () => {
    const options = buildRecentJobsClinicFilterOptions([
      { id: 'b', name: 'ひまわり歯科' },
      { id: 'a', name: 'あおぞら歯科' },
    ])
    assert.equal(options[0]?.value, '')
    assert.equal(options[0]?.label, 'すべてのクリニック')
    assert.equal(options[1]?.label, 'あおぞら歯科')
    assert.equal(options[2]?.label, 'ひまわり歯科')
  })

  it('全院のときクリニック列を出す', () => {
    assert.equal(shouldShowRecentJobsClinicColumn(''), true)
    assert.equal(shouldShowRecentJobsClinicColumn('c1'), false)
  })
})
