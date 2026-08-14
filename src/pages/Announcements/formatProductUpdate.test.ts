import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  formatProductUpdateDate,
  formatProductUpdateKindLabel,
  formatProductUpdateNumber,
  formatProductUpdatePlatformLabel,
  formatProductUpdateStatusLabel,
  formatProductUpdateSurfaceLabel,
} from './formatProductUpdate.ts'

describe('formatProductUpdateDate', () => {
  it('日本語で月日をゼロ埋めしない', () => {
    assert.equal(formatProductUpdateDate('2026-08-13T12:00:00.000Z'), '2026年8月13日')
  })

  it('欠損はダッシュ', () => {
    assert.equal(formatProductUpdateDate(null), '—')
  })
})

describe('formatProductUpdateNumber', () => {
  it('公開後の通し番号を update # にする', () => {
    assert.equal(formatProductUpdateNumber(12), 'update #12')
  })

  it('リリース予定（番号なし）は出さない', () => {
    assert.equal(formatProductUpdateNumber(null), null)
  })
})

describe('formatProductUpdate labels', () => {
  it('種類・対象・状態を日本語にする', () => {
    assert.equal(formatProductUpdateKindLabel('feature'), '新機能')
    assert.equal(formatProductUpdateSurfaceLabel('calendar'), 'カレンダー')
    assert.equal(formatProductUpdateStatusLabel('proposed'), 'リリース予定')
  })

  it('対象環境は Web / Mac / Windows と出す', () => {
    assert.equal(formatProductUpdatePlatformLabel('web'), 'Web')
    assert.equal(formatProductUpdatePlatformLabel('mac'), 'Mac')
    assert.equal(formatProductUpdatePlatformLabel('windows'), 'Windows')
  })
})
