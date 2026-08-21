import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

describe('NumberStepper', () => {
  it('ネイティブ number スピナーを使わない', () => {
    const source = readFileSync(join(here, 'NumberStepper.tsx'), 'utf8')
    assert.equal(source.includes('type="number"'), false)
    assert.match(source, /inputMode="numeric"/)
    assert.match(source, /減らす/)
    assert.match(source, /増やす/)
    assert.equal(source.includes('transition-all'), false)
    assert.equal(/lucide/i.test(source), false)
  })
})
