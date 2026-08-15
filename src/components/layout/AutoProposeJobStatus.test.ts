import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(here, 'AutoProposeJobStatus.tsx'), 'utf8')

describe('AutoProposeJobStatus', () => {
  it('右上は提案中と完了を出し、Composing は実行中だけ', () => {
    assert.match(source, /autoProposeStatusLabel/)
    assert.match(source, /ComposingOrb/)
    assert.match(source, /size=\{20\}/)
    assert.match(source, /to="\/calendar"/)
    assert.match(source, /job\.phase === 'running'/)
    assert.equal(source.includes("from 'thinking-orbs'"), false)
    assert.equal(source.includes("'Composing'"), false)
    assert.equal(/lucide/i.test(source), false)
  })
})
