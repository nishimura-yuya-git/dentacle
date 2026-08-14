import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildOperationClinicFilterOptions,
  filterOperationTraces,
  formatOperationActionLabel,
  formatOperationDetail,
  formatOperationEntityLabel,
  paginateOperationTraces,
} from './formatOperationTrace.ts'

describe('formatOperationTrace', () => {
  it('既知の action を日本語にする', () => {
    assert.equal(
      formatOperationActionLabel('visit.clear_auto_proposals'),
      '自動提案をクリア',
    )
    assert.equal(
      formatOperationActionLabel('visit.confirm_auto_proposals'),
      '自動提案を一括確定',
    )
    assert.equal(
      formatOperationActionLabel('visit.create_auto_proposal_gap_fill'),
      '空き枠埋めから仮予約を作成',
    )
  })

  it('未知の action は「その他の操作」にする', () => {
    assert.equal(formatOperationActionLabel('unknown.thing'), 'その他の操作')
  })

  it('entity_type を日本語にする', () => {
    assert.equal(formatOperationEntityLabel('visit'), '訪問')
    assert.equal(formatOperationEntityLabel('calendar_block'), '空きブロック')
    assert.equal(formatOperationEntityLabel('patient_import'), '患者取込')
  })

  it('レセコンCSV取込を日本語にし、件数と成否だけ詳細に出す', () => {
    assert.equal(
      formatOperationActionLabel('patient.import_rececon_csv'),
      'レセコンCSVを取り込んだ',
    )
    assert.equal(
      formatOperationDetail({
        action: 'patient.import_rececon_csv',
        entity_id: null,
        payload: {
          source: 'rececon_csv',
          outcome: 'partial',
          patientsInserted: 8,
          patientsUpdated: 2,
          errorCount: 1,
        },
      }),
      '一部エラー・新規 8・更新 2・エラー 1',
    )
    assert.equal(
      formatOperationDetail({
        action: 'patient.import_rececon_csv',
        entity_id: null,
        payload: {
          source: 'rececon_csv',
          outcome: 'failed',
          patientsInserted: 0,
          patientsUpdated: 0,
          errorCount: 1,
        },
      }),
      '失敗・新規 0・更新 0・エラー 1',
    )
  })

  it('payload の件数・対象日を詳細に出す', () => {
    assert.equal(
      formatOperationDetail({
        action: 'visit.clear_auto_proposals',
        entity_id: null,
        payload: { date: '2026-08-11', count: 20 },
      }),
      '対象日 2026年8月11日・20件',
    )
  })

  it('詳細が無い既知操作は — を返す', () => {
    assert.equal(
      formatOperationDetail({
        action: 'visit.cancel',
        entity_id: null,
        payload: {},
      }),
      '—',
    )
  })

  it('未知操作で詳細が無いときは action キーを補助表示する', () => {
    assert.equal(
      formatOperationDetail({
        action: 'custom.future',
        entity_id: null,
        payload: null,
      }),
      'custom.future',
    )
  })

  it('クリニック・操作・対象セレクトで絞り込む', () => {
    const rows = [
      {
        id: '1',
        action: 'visit.cancel',
        entity_type: 'visit',
        clinic_id: 'c1',
      },
      {
        id: '2',
        action: 'visit.clear_auto_proposals',
        entity_type: 'visit',
        clinic_id: 'c1',
      },
      {
        id: '3',
        action: 'calendar_block.create',
        entity_type: 'calendar_block',
        clinic_id: 'c2',
      },
    ]
    assert.deepEqual(
      filterOperationTraces(rows, {
        clinicId: '',
        action: 'visit.cancel',
        entityType: '',
      }).map((r) => r.id),
      ['1'],
    )
    assert.deepEqual(
      filterOperationTraces(rows, {
        clinicId: 'c2',
        action: '',
        entityType: '',
      }).map((r) => r.id),
      ['3'],
    )
    assert.equal(
      filterOperationTraces(rows, {
        clinicId: '',
        action: '',
        entityType: '',
      }).length,
      3,
    )
  })

  it('クリニック Select オプションを名前順で作る', () => {
    const options = buildOperationClinicFilterOptions([
      { id: 'b', name: 'ひまわり歯科' },
      { id: 'a', name: 'あおぞら歯科' },
    ])
    assert.equal(options[0]?.value, '')
    assert.equal(options[0]?.label, 'すべてのクリニック')
    assert.equal(options[1]?.label, 'あおぞら歯科')
    assert.equal(options[2]?.label, 'ひまわり歯科')
  })

  it('ページネーションで件数切替できる', () => {
    const rows = Array.from({ length: 25 }, (_, i) => ({ id: String(i + 1) }))
    const first = paginateOperationTraces(rows, 1, 10)
    assert.equal(first.totalPages, 3)
    assert.deepEqual(
      first.pageRows.map((r) => r.id),
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
    )
    const last = paginateOperationTraces(rows, 3, 10)
    assert.deepEqual(
      last.pageRows.map((r) => r.id),
      ['21', '22', '23', '24', '25'],
    )
    const clamped = paginateOperationTraces(rows, 99, 20)
    assert.equal(clamped.page, 2)
    assert.equal(clamped.pageRows.length, 5)
  })
})
