import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

describe('Checkbox', () => {
  it('ネイティブ見た目を出さず主色の独自枠にする', () => {
    const source = readFileSync(join(here, 'Checkbox.tsx'), 'utf8')
    assert.match(source, /sr-only/)
    assert.match(source, /bg-\[#008C01\]/)
    assert.match(source, /border-slate-300/)
    assert.match(source, /peer-focus-visible:ring-4/)
    assert.equal(source.includes('transition-all'), false)
    assert.equal(/lucide/i.test(source), false)
  })
})
