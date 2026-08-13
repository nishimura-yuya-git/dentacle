import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  PRODUCT_UPDATE_PLATFORMS,
  PRODUCT_UPDATE_SURFACES,
  assertProductUpdateCreatedAsProposal,
  canReviewProductUpdate,
  isProductUpdateVisibleToClinic,
} from './productUpdatePolicy.ts'

describe('isProductUpdateVisibleToClinic', () => {
  it('公開だけ院ユーザーに見える', () => {
    assert.equal(isProductUpdateVisibleToClinic('published'), true)
  })

  it('提案中は実装・デプロイしても院の一覧に出ない', () => {
    assert.equal(isProductUpdateVisibleToClinic('proposed'), false)
  })

  it('入れないにした更新は院の一覧に出ない', () => {
    assert.equal(isProductUpdateVisibleToClinic('rejected'), false)
  })
})

describe('canReviewProductUpdate', () => {
  it('提案中だけ入れる／入れないを選べる', () => {
    assert.equal(canReviewProductUpdate('proposed'), true)
    assert.equal(canReviewProductUpdate('published'), false)
    assert.equal(canReviewProductUpdate('rejected'), false)
  })
})

describe('PRODUCT_UPDATE_PLATFORMS', () => {
  it('対象環境は Web / Mac / Windows で、画面対象とは別', () => {
    assert.deepEqual([...PRODUCT_UPDATE_PLATFORMS], ['web', 'mac', 'windows'])
    assert.equal((PRODUCT_UPDATE_SURFACES as readonly string[]).includes('web'), false)
  })
})

describe('assertProductUpdateCreatedAsProposal', () => {
  it('新規は提案ステータスのみ許可する', () => {
    assert.doesNotThrow(() => assertProductUpdateCreatedAsProposal({ status: 'proposed' }))
  })

  it('新規をいきなり公開にできない', () => {
    assert.throws(
      () => assertProductUpdateCreatedAsProposal({ status: 'published' }),
      /提案として作成/,
    )
  })
})
