import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(here, 'GapFillPanel.tsx'), 'utf8')

describe('GapFillPanel', () => {
  it('候補探索中は Composing を出し Button の処理中文言にはしない', () => {
    assert.match(source, /from '@\/components\/ui\/ComposingOrb'/)
    assert.match(source, /busy \?/)
    assert.match(source, /候補を探しています/)
    assert.match(source, /size=\{64\}/)
    assert.equal(source.includes('loading={busy}'), false)
    assert.equal(source.includes("from 'thinking-orbs'"), false)
    assert.equal(source.includes("'Composing'"), false)
    assert.equal(source.includes('"Composing"'), false)
    assert.equal(/lucide/i.test(source), false)
  })
})
