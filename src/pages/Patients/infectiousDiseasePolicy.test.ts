import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  INFECTIOUS_DISEASE_LABEL,
  INFECTIOUS_FILL_CLASS,
  listRowClassName,
  readHasInfectiousDisease,
  visitBlockTextClasses,
} from './infectiousDiseasePolicy.ts'

describe('readHasInfectiousDisease', () => {
  it('true だけを感染症とする', () => {
    assert.equal(readHasInfectiousDisease(true), true)
    assert.equal(readHasInfectiousDisease(false), false)
    assert.equal(readHasInfectiousDisease(null), false)
    assert.equal(readHasInfectiousDisease(undefined), false)
    assert.equal(readHasInfectiousDisease('true'), false)
    assert.equal(readHasInfectiousDisease(1), false)
  })
})

describe('感染症の見た目', () => {
  it('ラベルは感染症', () => {
    assert.equal(INFECTIOUS_DISEASE_LABEL, '感染症')
  })

  it('チェック済み行は黒寄り灰色でホバーも暗いまま', () => {
    const row = listRowClassName(true, 0)
    assert.match(row, new RegExp(INFECTIOUS_FILL_CLASS))
    assert.match(row, /hover:bg-slate-800/)
    assert.doesNotMatch(row, /hover:bg-emerald-50/)
    assert.doesNotMatch(listRowClassName(false, 0), new RegExp(INFECTIOUS_FILL_CLASS))
  })

  it('カレンダー文字は暗い面で白寄り', () => {
    const infectious = visitBlockTextClasses(true)
    assert.match(infectious.name, /text-slate-50/)
    const normal = visitBlockTextClasses(false)
    assert.match(normal.name, /text-slate-900/)
  })
})
