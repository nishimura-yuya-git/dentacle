import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  initialOpenHelpFaqIds,
  nextHelpFaqHash,
  resolveHelpFaqHash,
  toggleHelpFaqItem,
} from './helpAccordionPolicy.ts'

const knownIds = ['what', 'billing', 'network']

describe('toggleHelpFaqItem', () => {
  it('閉じている項目を開き、既に開いている項目は閉じる', () => {
    assert.deepEqual(toggleHelpFaqItem([], 'what'), ['what'])
    assert.deepEqual(toggleHelpFaqItem(['what'], 'billing'), ['what', 'billing'])
    assert.deepEqual(toggleHelpFaqItem(['what', 'billing'], 'what'), ['billing'])
  })
})

describe('resolveHelpFaqHash / initialOpenHelpFaqIds', () => {
  it('既知のハッシュだけ初期オープンにする', () => {
    assert.equal(resolveHelpFaqHash('#billing', knownIds), 'billing')
    assert.equal(resolveHelpFaqHash('network', knownIds), 'network')
    assert.equal(resolveHelpFaqHash('#unknown', knownIds), null)
    assert.equal(resolveHelpFaqHash('#', knownIds), null)
    assert.deepEqual(initialOpenHelpFaqIds('#network', knownIds), ['network'])
    assert.deepEqual(initialOpenHelpFaqIds('#missing', knownIds), [])
  })
})

describe('nextHelpFaqHash', () => {
  it('開いた項目の id をハッシュにし、同じ項目を閉じたら外す', () => {
    assert.equal(nextHelpFaqHash(['what'], 'what', ''), '#what')
    assert.equal(nextHelpFaqHash([], 'what', '#what'), '')
    assert.equal(nextHelpFaqHash(['billing'], 'what', '#billing'), '#billing')
  })
})
