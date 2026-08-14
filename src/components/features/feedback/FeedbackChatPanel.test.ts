import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

describe('ご意見の送信ボタン', () => {
  it('入力欄の中に紙飛行機を置き、見える「送信する」文言は置かない', () => {
    const source = readFileSync(join(here, 'FeedbackChatPanel.tsx'), 'utf8')
    assert.match(source, /src="\/icon\/paper-plane\.png"/)
    assert.match(source, /aria-label="送信する"/)
    assert.match(source, /absolute bottom-2 right-2/)
    assert.match(source, /h-7 w-7/)
    assert.match(source, /rounded-full/)
    assert.equal(source.includes('variant="primary"'), false)
    const visibleLabel = source.match(/>\s*送信する\s*</)
    assert.equal(visibleLabel, null)
  })

  it('入力欄の上に Enterで送信の設定行を置く', () => {
    const source = readFileSync(join(here, 'FeedbackChatPanel.tsx'), 'utf8')
    const rowAt = source.indexOf('PreferenceRow')
    const areaAt = source.indexOf('<textarea')
    assert.ok(rowAt > 0 && rowAt < areaAt)
    assert.match(source, /SEND_ON_ENTER_LABEL/)
    assert.match(source, /sendOnEnterDescription/)
    assert.match(source, /resolveEnterKeyAction/)
    assert.match(source, /onKeyDown=\{handleDraftKeyDown\}/)
    assert.equal(source.includes('その他の設定'), false)
    assert.equal(/\bPro\b/.test(source), false)
    assert.equal(/lucide/i.test(source), false)
  })
})
