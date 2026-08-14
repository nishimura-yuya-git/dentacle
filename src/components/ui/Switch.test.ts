import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

describe('Switch', () => {
  it('role=switch と案件のオンオフ色を使う', () => {
    const source = readFileSync(join(here, 'Switch.tsx'), 'utf8')
    assert.match(source, /role="switch"/)
    assert.match(source, /aria-checked/)
    assert.match(source, /bg-\[#008C01\]/)
    assert.match(source, /bg-slate-200/)
    assert.match(source, /focus-visible:ring-4/)
    assert.equal(source.includes('transition-all'), false)
    assert.equal(/lucide/i.test(source), false)
  })
})
