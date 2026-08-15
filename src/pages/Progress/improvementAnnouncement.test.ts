import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  IMPROVEMENT_ANNOUNCEMENT_FALLBACK_BODY,
  IMPROVEMENT_ANNOUNCEMENT_FALLBACK_TITLE,
  buildClinicReplyBody,
  buildImprovementAnnouncementCopy,
  formatImprovementStatusSavedMessage,
  shouldNotifyClinicReplyOnStatus,
  shouldPublishAnnouncementOnStatus,
  surfaceFromImprovementPagePath,
  surfacesFromImprovementPagePath,
} from './improvementAnnouncement.ts'

describe('shouldPublishAnnouncementOnStatus', () => {
  it('反映済みのときだけお知らせに入れる', () => {
    assert.equal(shouldPublishAnnouncementOnStatus('done'), true)
    assert.equal(shouldPublishAnnouncementOnStatus('received'), false)
    assert.equal(shouldPublishAnnouncementOnStatus('reviewing'), false)
    assert.equal(shouldPublishAnnouncementOnStatus('in_progress'), false)
    assert.equal(shouldPublishAnnouncementOnStatus('wont_fix'), false)
  })
})

describe('surfaceFromImprovementPagePath', () => {
  it('既知の画面パスを対象画面にする', () => {
    assert.equal(surfaceFromImprovementPagePath('/calendar'), 'calendar')
    assert.equal(surfaceFromImprovementPagePath('/patients?tab=1'), 'patients')
    assert.equal(surfaceFromImprovementPagePath('/contacts'), 'contacts')
    assert.equal(surfaceFromImprovementPagePath('/users'), 'users')
    assert.equal(surfaceFromImprovementPagePath('/settings'), 'settings')
    assert.equal(surfaceFromImprovementPagePath('/import'), 'import')
  })

  it('未知・空のパスは全体にする', () => {
    assert.equal(surfaceFromImprovementPagePath('/feedback'), 'all')
    assert.equal(surfaceFromImprovementPagePath('/unknown'), 'all')
    assert.equal(surfaceFromImprovementPagePath(null), 'all')
    assert.deepEqual(surfacesFromImprovementPagePath('/calendar'), ['calendar'])
  })
})

describe('buildImprovementAnnouncementCopy', () => {
  it('見出しと本文を院向けに整える', () => {
    const copy = buildImprovementAnnouncementCopy({
      title: 'カレンダーの表示が遅い',
      summary: '月末の描画が重い',
    })
    assert.equal(copy.title, 'カレンダーの表示が遅い')
    assert.equal(copy.body, '月末の描画が重い')
    assert.equal(copy.kind, 'fix')
    assert.equal(copy.platform, 'web')
    assert.equal(copy.detailUrl, null)
  })

  it('本文が空か見出しと同じなら定型文にする', () => {
    const empty = buildImprovementAnnouncementCopy({
      title: '印刷できない',
      summary: null,
    })
    assert.equal(empty.body, IMPROVEMENT_ANNOUNCEMENT_FALLBACK_BODY)

    const same = buildImprovementAnnouncementCopy({
      title: '印刷できない',
      summary: '印刷できない',
    })
    assert.equal(same.body, IMPROVEMENT_ANNOUNCEMENT_FALLBACK_BODY)
  })

  it('GitHub や Issue を含む文言は院向けに出さない', () => {
    const copy = buildImprovementAnnouncementCopy({
      title: 'GitHub Issue #12 を直した',
      summary: 'https://github.com/example/repo/issues/12',
    })
    assert.equal(copy.title, IMPROVEMENT_ANNOUNCEMENT_FALLBACK_TITLE)
    assert.equal(copy.body, IMPROVEMENT_ANNOUNCEMENT_FALLBACK_BODY)
  })
})

describe('shouldNotifyClinicReplyOnStatus', () => {
  it('反映済みのときだけ本人チャットに返す', () => {
    assert.equal(shouldNotifyClinicReplyOnStatus('done'), true)
    assert.equal(shouldNotifyClinicReplyOnStatus('wont_fix'), false)
    assert.equal(shouldNotifyClinicReplyOnStatus('in_progress'), false)
  })
})

describe('buildClinicReplyBody', () => {
  it('お知らせと同じ見出しと定型文にする', () => {
    assert.equal(
      buildClinicReplyBody('カレンダーの表示が遅い'),
      `カレンダーの表示が遅い\n\n${IMPROVEMENT_ANNOUNCEMENT_FALLBACK_BODY}`,
    )
  })

  it('GitHub や Issue を含む見出しは院向けに出さない', () => {
    const body = buildClinicReplyBody('GitHub Issue #12 を直した')
    assert.equal(body, `${IMPROVEMENT_ANNOUNCEMENT_FALLBACK_TITLE}\n\n${IMPROVEMENT_ANNOUNCEMENT_FALLBACK_BODY}`)
    assert.equal(/github|issue/i.test(body), false)
  })
})

describe('formatImprovementStatusSavedMessage', () => {
  it('反映済みではお知らせとご意見チャットに載ることを伝える', () => {
    assert.equal(
      formatImprovementStatusSavedMessage('done'),
      '反映済みにしました。お知らせにも載ります。ご意見チャットにも返します。',
    )
    assert.equal(formatImprovementStatusSavedMessage('in_progress'), '状態を更新しました。')
    assert.equal(formatImprovementStatusSavedMessage('wont_fix'), '状態を更新しました。')
  })
})
