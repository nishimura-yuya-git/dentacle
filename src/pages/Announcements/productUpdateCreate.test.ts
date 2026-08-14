import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  formatProductUpdateCreateCopy,
  formatProductUpdateTitleFieldCopy,
  isTitleOnlyProductUpdateCreate,
  shouldPublishAfterPropose,
} from './productUpdateCreate.ts'

describe('shouldPublishAfterPropose', () => {
  it('リリース予定は提案だけで公開しない', () => {
    assert.equal(shouldPublishAfterPropose('upcoming'), false)
  })

  it('更新情報は提案したあと入れる', () => {
    assert.equal(shouldPublishAfterPropose('published'), true)
  })
})

describe('formatProductUpdateCreateCopy', () => {
  it('リリース予定の登録文言を返す', () => {
    const copy = formatProductUpdateCreateCopy('upcoming')
    assert.equal(copy.title, 'リリース予定を登録')
    assert.equal(copy.submitLabel, '登録する')
    assert.equal(copy.successMessage, 'リリース予定に登録しました。')
  })

  it('更新情報の登録文言を返す', () => {
    const copy = formatProductUpdateCreateCopy('published')
    assert.equal(copy.title, '更新情報の登録')
    assert.equal(copy.submitLabel, '登録する')
    assert.equal(copy.successMessage, '更新情報に登録しました。')
  })
})

describe('isTitleOnlyProductUpdateCreate', () => {
  it('リリース予定だけ項目1つにする', () => {
    assert.equal(isTitleOnlyProductUpdateCreate('upcoming'), true)
    assert.equal(isTitleOnlyProductUpdateCreate('published'), false)
  })
})

describe('formatProductUpdateTitleFieldCopy', () => {
  it('予定は項目、済みは見出し', () => {
    assert.equal(formatProductUpdateTitleFieldCopy('upcoming').label, '項目')
    assert.equal(formatProductUpdateTitleFieldCopy('upcoming').error, '項目を入力してください。')
    assert.equal(formatProductUpdateTitleFieldCopy('published').label, '見出し')
    assert.equal(formatProductUpdateTitleFieldCopy('published').error, '見出しを入力してください。')
  })
})
