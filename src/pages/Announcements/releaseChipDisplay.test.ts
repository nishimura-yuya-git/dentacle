import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  ANNOUNCEMENT_HEADER_ACTION_CLASS,
  formatReleaseChipBadge,
  formatReleaseChipEmptyCopy,
  formatReleaseSectionTitle,
  RELEASE_IN_PROGRESS_BADGE_LABEL,
  RELEASE_PANEL_ACTION_CLASS,
  RELEASE_PUBLISHED_MARK_SRC,
  RELEASE_UPCOMING_MARK_SRC,
  releaseSectionMarkSrc,
} from './releaseChipDisplay.ts'

describe('formatReleaseSectionTitle', () => {
  it('公開面は更新情報、予定面はリリース予定', () => {
    assert.equal(formatReleaseSectionTitle('published'), '更新情報')
    assert.equal(formatReleaseSectionTitle('upcoming'), 'リリース予定')
  })
})

describe('releaseSectionMarkSrc', () => {
  it('予定は optimization、済みは solution。火印は使わない', () => {
    assert.equal(releaseSectionMarkSrc('upcoming'), RELEASE_UPCOMING_MARK_SRC)
    assert.equal(RELEASE_UPCOMING_MARK_SRC, '/icon/optimization.png')
    assert.equal(releaseSectionMarkSrc('published'), RELEASE_PUBLISHED_MARK_SRC)
    assert.equal(RELEASE_PUBLISHED_MARK_SRC, '/icon/solution.png')
  })
})

describe('formatReleaseChipEmptyCopy', () => {
  it('空状態を面ごとに日本語で返す', () => {
    assert.equal(formatReleaseChipEmptyCopy('published'), '更新情報はまだありません。')
    assert.equal(formatReleaseChipEmptyCopy('upcoming'), 'リリース予定はまだありません。')
  })
})

describe('formatReleaseChipBadge', () => {
  it('予定は右上に開発中。英語 WIP は使わない', () => {
    const badge = formatReleaseChipBadge({ status: 'proposed', kindLabel: '新機能' })
    assert.deepEqual(badge, {
      label: RELEASE_IN_PROGRESS_BADGE_LABEL,
      placement: 'top-end',
      tone: 'in-progress',
    })
    assert.equal(RELEASE_IN_PROGRESS_BADGE_LABEL, '開発中')
    assert.equal(RELEASE_IN_PROGRESS_BADGE_LABEL.includes('WIP'), false)
  })

  it('予定でもOFFなら開発中を出さない', () => {
    assert.equal(
      formatReleaseChipBadge({
        status: 'proposed',
        kindLabel: '新機能',
        showInProgressBadge: false,
      }),
      null,
    )
  })

  it('済みは種類バッジを右下に残す', () => {
    assert.deepEqual(formatReleaseChipBadge({ status: 'published', kindLabel: '改善' }), {
      label: '改善',
      placement: 'bottom-end',
      tone: 'kind',
    })
  })

  it('入れないはバッジを出さない', () => {
    assert.equal(formatReleaseChipBadge({ status: 'rejected', kindLabel: '修正' }), null)
  })
})

describe('RELEASE_PANEL_ACTION_CLASS', () => {
  it('斜線面のボタンは主色より薄い緑で、全体主色は使わない', () => {
    assert.match(RELEASE_PANEL_ACTION_CLASS, /#6BB86B/)
    assert.equal(RELEASE_PANEL_ACTION_CLASS.includes('#008C01'), false)
  })
})

describe('ANNOUNCEMENT_HEADER_ACTION_CLASS', () => {
  it('見出し右の登録は淡い緑面で、濃い主色塗りではない', () => {
    assert.match(ANNOUNCEMENT_HEADER_ACTION_CLASS, /bg-emerald-50/)
    assert.equal(ANNOUNCEMENT_HEADER_ACTION_CLASS.includes('!bg-\\[#008C01\\]'), false)
    assert.equal(ANNOUNCEMENT_HEADER_ACTION_CLASS.includes('!bg-[#008C01]'), false)
  })
})
