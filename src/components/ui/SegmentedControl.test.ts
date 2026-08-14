import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

describe('SegmentedControl', () => {
  it('灰トラックの上に選中だけ白ピルを置く', () => {
    const source = readFileSync(join(here, 'SegmentedControl.tsx'), 'utf8')
    assert.match(source, /bg-slate-100/)
    assert.match(source, /rounded-full/)
    assert.match(source, /bg-white/)
    assert.match(source, /shadow-sm/)
    assert.match(source, /text-slate-900/)
    assert.match(source, /text-slate-500/)
    assert.equal(source.includes('bg-[#008C01]'), false)
    assert.equal(source.includes('transition-all'), false)
    assert.equal(/\bPro\b/.test(source), false)
    assert.equal(/lucide/i.test(source), false)
  })
})
