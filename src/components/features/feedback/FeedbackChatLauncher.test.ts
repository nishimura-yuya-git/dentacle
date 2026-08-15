import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

describe('ご意見FAB', () => {
  it('閉じているときは public/icon/chat.png を使う', () => {
    const source = readFileSync(join(here, 'FeedbackChatLauncher.tsx'), 'utf8')
    assert.match(source, /src="\/icon\/chat\.png"/)
    assert.equal(source.includes('ChatGlyph'), false)
  })

  it('ボタン面は濃い主色ではなく淡い緑にする', () => {
    const source = readFileSync(join(here, 'FeedbackChatLauncher.tsx'), 'utf8')
    assert.match(source, /bg-\[#E7F4E7\]/)
    assert.match(source, /bottom-5 right-5/)
    assert.match(source, /h-14 w-14/)
    assert.equal(source.includes('bg-[#008C01]'), false)
    assert.equal(source.includes('text-white'), false)
  })

  it('未読は件数なしの点で、閉じているときだけ出す', () => {
    const source = readFileSync(join(here, 'FeedbackChatLauncher.tsx'), 'utf8')
    assert.match(source, /FeedbackUnreadDot/)
    assert.match(source, /shouldShowFeedbackUnreadDot/)
    assert.match(source, /FEEDBACK_UNREAD_ARIA_LABEL/)
    assert.equal(source.includes('未読'), false)
    assert.equal(/\d件/.test(source), false)
  })

  it('開いているときは周りをクリックしても閉じる', () => {
    const source = readFileSync(join(here, 'FeedbackChatLauncher.tsx'), 'utf8')
    assert.match(source, /shouldCloseFeedbackOnOutsideClick/)
    assert.match(source, /mousedown/)
    assert.equal(source.includes('bg-slate-900/40'), false)
  })
})
