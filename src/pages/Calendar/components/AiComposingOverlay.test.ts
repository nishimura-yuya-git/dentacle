import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(here, 'AiComposingOverlay.tsx'), 'utf8')

describe('AiComposingOverlay', () => {
  it('明るい半透明の上に 64px Composing と日本語だけを置く', () => {
    assert.match(source, /from '@\/components\/ui\/ComposingOrb'/)
    assert.match(source, /size=\{64\}/)
    assert.match(source, /bg-white\/70/)
    assert.match(source, /提案を作成しています/)
    assert.match(source, /role="status"/)
    assert.match(source, /aria-live="polite"/)
    assert.equal(source.includes('bg-black'), false)
    assert.equal(source.includes('bg-slate-900'), false)
    assert.equal(source.includes("'Composing'"), false)
    assert.equal(source.includes('"Composing"'), false)
    assert.equal(/lucide/i.test(source), false)
  })
})
