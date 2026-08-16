import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  readIntroductionLane,
  readRececonVendorId,
  readVisitMenuEnabled,
  withIntroductionLane,
  withRececonVendorId,
  withVisitMenuEnabled,
} from './clinicMetadata.ts'

describe('clinicMetadata visit_menu_enabled', () => {
  it('未設定は空オブジェクト（呼び出し側は ON 扱い）', () => {
    assert.deepEqual(readVisitMenuEnabled(null), {})
    assert.deepEqual(readVisitMenuEnabled({ introduction_lane: 'startup' }), {})
  })

  it('OFF だけ残し、導入タイプは消さない', () => {
    const next = withVisitMenuEnabled(
      { introduction_lane: 'existing', visit_menu_enabled: { extraction: false } },
      { extraction: true, 'first-visit': false },
    )
    assert.deepEqual(next.visit_menu_enabled, { 'first-visit': false })
    assert.equal(readIntroductionLane(next as never), 'existing')
    assert.deepEqual(readVisitMenuEnabled(next as never), { 'first-visit': false })
  })

  it('導入タイプの更新でメニュー設定を消さない', () => {
    const next = withIntroductionLane(
      { visit_menu_enabled: { extraction: false } },
      'startup',
    )
    assert.deepEqual(readVisitMenuEnabled(next as never), { extraction: false })
  })
})

describe('clinicMetadata rececon_vendor', () => {
  it('未設定はノーザ想定にし、他の metadata は消さない', () => {
    assert.equal(readRececonVendorId(null), 'nhosa')
    assert.equal(readRececonVendorId({ introduction_lane: 'existing' }), 'nhosa')

    const next = withRececonVendorId(
      { introduction_lane: 'existing', visit_menu_enabled: { extraction: false } },
      'nhosa',
    )
    assert.equal(next.rececon_vendor, 'nhosa')
    assert.equal(readIntroductionLane(next as never), 'existing')
    assert.deepEqual(readVisitMenuEnabled(next as never), { extraction: false })
    assert.equal(readRececonVendorId(next as never), 'nhosa')
  })
})
