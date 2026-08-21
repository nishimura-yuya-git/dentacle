import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  fallbackPatientIconId,
  isPatientIconId,
  PATIENT_ICON_IDS,
  patientIconSrc,
  readPatientIconId,
  resolvePatientIconId,
  withPatientIcon,
  withRececonImportMetadata,
} from './patientIconPolicy.ts'

describe('isPatientIconId', () => {
  it('1〜7だけ通す', () => {
    assert.equal(isPatientIconId('1'), true)
    assert.equal(isPatientIconId('7'), true)
    assert.equal(isPatientIconId('0'), false)
    assert.equal(isPatientIconId(1), false)
    assert.equal(isPatientIconId('8'), false)
  })
})

describe('fallbackPatientIconId', () => {
  it('同じIDは同じアイコンになる', () => {
    const first = fallbackPatientIconId('patient-abc')
    const second = fallbackPatientIconId('patient-abc')
    assert.equal(first, second)
    assert.equal(PATIENT_ICON_IDS.includes(first), true)
  })

  it('空は1にする', () => {
    assert.equal(fallbackPatientIconId(''), '1')
    assert.equal(fallbackPatientIconId('   '), '1')
  })
})

describe('read / resolvePatientIconId', () => {
  it('保存値を優先し、無ければハッシュ', () => {
    assert.equal(readPatientIconId({ user_icon: '3', visit_count: 2 }), '3')
    assert.equal(readPatientIconId({ visit_count: 2 }), null)
    assert.equal(resolvePatientIconId({ user_icon: '5' }, 'other'), '5')
    assert.equal(resolvePatientIconId({}, 'patient-abc'), fallbackPatientIconId('patient-abc'))
  })
})

describe('withPatientIcon', () => {
  it('来院回数を消さない', () => {
    const next = withPatientIcon({ visit_count: 12, seed_source: 'rececon_csv' }, '4')
    assert.equal(next.user_icon, '4')
    assert.equal(next.visit_count, 12)
    assert.equal(next.seed_source, 'rececon_csv')
  })
})

describe('withRececonImportMetadata', () => {
  it('アイコンを残して来院回数だけ更新する', () => {
    const next = withRececonImportMetadata({ user_icon: '6', visit_count: 1 }, 9)
    assert.equal(next.user_icon, '6')
    assert.equal(next.visit_count, 9)
    assert.equal(next.seed_source, 'rececon_csv')
  })

  it('来院回数が無い更新でもアイコンは残す', () => {
    const next = withRececonImportMetadata({ user_icon: '2', visit_count: 4 }, null)
    assert.equal(next.user_icon, '2')
    assert.equal(next.visit_count, 4)
  })
})

describe('patientIconSrc', () => {
  it('public/user_icon のパスにする', () => {
    assert.equal(patientIconSrc('1'), '/user_icon/1.png')
  })
})

describe('ファイル名の衝突', () => {
  it('同じフォルダに大文字小文字だけ違うファイルを置かない', () => {
    const here = dirname(fileURLToPath(import.meta.url))
    const names = readdirSync(here).map((name) => name.toLowerCase())
    const unique = new Set(names)
    assert.equal(names.length, unique.size)
  })
})
