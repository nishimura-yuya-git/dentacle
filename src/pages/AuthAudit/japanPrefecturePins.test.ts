import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  getJapanPrefectureCode,
  getJapanPrefectureKeyByCode,
  isJapanCountryName,
  resolveJapanPrefectureKey,
} from './japanPrefecturePins.ts'

describe('isJapanCountryName', () => {
  it('日本表記を判定する', () => {
    assert.equal(isJapanCountryName('日本'), true)
    assert.equal(isJapanCountryName('Japan'), true)
    assert.equal(isJapanCountryName('JP'), true)
  })

  it('海外は false', () => {
    assert.equal(isJapanCountryName('United States'), false)
  })
})

describe('resolveJapanPrefectureKey', () => {
  it('大阪府・大阪・Osaka を同一 key にする', () => {
    assert.equal(resolveJapanPrefectureKey('大阪府'), 'osaka')
    assert.equal(resolveJapanPrefectureKey('大阪'), 'osaka')
    assert.equal(resolveJapanPrefectureKey('Osaka'), 'osaka')
  })

  it('東京都を解決する', () => {
    assert.equal(resolveJapanPrefectureKey('東京都'), 'tokyo')
  })
})

describe('Geolonia data-code 対応', () => {
  it('大阪府は code 27', () => {
    assert.equal(getJapanPrefectureCode('osaka'), '27')
    assert.equal(getJapanPrefectureKeyByCode('27'), 'osaka')
  })
})
