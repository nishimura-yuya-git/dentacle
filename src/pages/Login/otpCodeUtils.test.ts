import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { normalizeOtpDigits, otpDigitsArray } from './otpCodeUtils.ts'

describe('normalizeOtpDigits', () => {
  it('コピペの6桁をそのまま数字列にする', () => {
    assert.equal(normalizeOtpDigits('123456'), '123456')
  })

  it('空白やハイフンを除去する', () => {
    assert.equal(normalizeOtpDigits('12 34-56'), '123456')
  })

  it('6桁を超える分は切り捨てる', () => {
    assert.equal(normalizeOtpDigits('1234567890'), '123456')
  })
})

describe('otpDigitsArray', () => {
  it('マス表示用に6要素へ分割する', () => {
    assert.deepEqual(otpDigitsArray('12'), ['1', '2', '', '', '', ''])
  })
})
