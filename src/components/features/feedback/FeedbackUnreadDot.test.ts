import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

describe('ご意見FABの未読点', () => {
  it('主色の点だけで、件数と Lucide を使わない', () => {
    const source = readFileSync(join(here, 'FeedbackUnreadDot.tsx'), 'utf8')
    assert.match(source, /bg-\[#008C01\]/)
    assert.match(source, /h-2\.5 w-2\.5/)
    assert.match(source, /aria-hidden="true"/)
    assert.equal(/\d件/.test(source), false)
    assert.equal(/lucide/i.test(source), false)
  })
})
