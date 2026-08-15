import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(here, 'ComposingOrb.tsx'), 'utf8')

describe('ComposingOrb', () => {
  it('thinking-orbs の composing だけを明るい面向けに包む', () => {
    assert.match(source, /from 'thinking-orbs'/)
    assert.match(source, /state="composing"/)
    assert.match(source, /theme="light"/)
    assert.match(source, /提案を作成しています/)
    assert.match(source, /size = 64/)
    assert.equal(source.includes('state="working"'), false)
    assert.equal(source.includes("'Composing'"), false)
    assert.equal(source.includes('"Composing"'), false)
    assert.equal(/lucide/i.test(source), false)
  })

  it('カレンダー自動提案の実行中だけオーブとオーバーレイを出す', () => {
    const calendar = readFileSync(
      join(here, '../../pages/Calendar/CalendarPage.tsx'),
      'utf8',
    )
    assert.match(calendar, /from '@\/components\/ui\/ComposingOrb'/)
    assert.match(calendar, /from '@\/pages\/Calendar\/components\/AiComposingOverlay'/)
    assert.match(calendar, /autoPropose\.progressActive/)
    assert.match(calendar, /showProposeOverlay \? <AiComposingOverlay/)
    assert.match(calendar, /size=\{20\}/)
    assert.equal(calendar.includes("from 'thinking-orbs'"), false)
    assert.equal(calendar.includes("'Composing'"), false)
    assert.equal(calendar.includes('"Composing"'), false)
  })
})
