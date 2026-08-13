import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { FEEDBACK_GREETING } from './feedbackCopy.ts'
import { PUBLIC_FEEDBACK_ERROR } from '../../../server/feedback/publicErrors.ts'

const here = dirname(fileURLToPath(import.meta.url))

describe('ご意見チャットの院向け文言', () => {
  it('挨拶に Issue と書かない', () => {
    assert.equal(/issue/i.test(FEEDBACK_GREETING), false)
    assert.match(FEEDBACK_GREETING, /開発チームが内容を確認します/)
  })

  it('公開エラーに Issue と書かない', () => {
    for (const message of Object.values(PUBLIC_FEEDBACK_ERROR)) {
      assert.equal(/issue/i.test(message), false, message)
    }
  })

  it('チャット画面の表示文言に Issue と書かない', () => {
    const panel = readFileSync(
      join(here, '../../components/features/feedback/FeedbackChatPanel.tsx'),
      'utf8',
    )
    const quoted = [...panel.matchAll(/['"`]([^'"`]*Issue[^'"`]*)['"`]/gi)].map(
      (match) => match[1],
    )
    assert.deepEqual(quoted, [])
  })
})
