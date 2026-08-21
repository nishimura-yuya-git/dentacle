import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  clampStepperInt,
  digitsOnly,
  parseStepperInt,
  stepStepperInt,
} from './numberStepperPolicy.ts'

describe('clampStepperInt', () => {
  it('範囲内に収める', () => {
    assert.equal(clampStepperInt(30, 1, 240), 30)
    assert.equal(clampStepperInt(0, 1, 240), 1)
    assert.equal(clampStepperInt(300, 1, 240), 240)
  })
})

describe('parseStepperInt', () => {
  it('数字以外を除いて範囲に収める', () => {
    assert.equal(parseStepperInt('45', 30, 1, 240), 45)
    assert.equal(parseStepperInt('abc', 30, 1, 240), 30)
    assert.equal(parseStepperInt('0', 30, 1, 240), 1)
  })
})

describe('stepStepperInt', () => {
  it('増減して下限上限で止める', () => {
    assert.equal(stepStepperInt(30, 5, 1, 240), 35)
    assert.equal(stepStepperInt(3, -5, 1, 240), 1)
  })
})

describe('digitsOnly', () => {
  it('数字だけ残す', () => {
    assert.equal(digitsOnly('3a0分'), '30')
  })
})
