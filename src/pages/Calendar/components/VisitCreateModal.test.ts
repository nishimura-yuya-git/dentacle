import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(here, 'VisitCreateModal.tsx'), 'utf8')

describe('VisitCreateModal', () => {
  it('本予約（確定）を仮予約と切り替えられる', () => {
    assert.match(source, /from '@\/components\/ui\/SegmentedControl'/)
    assert.match(source, /booking_status/)
    assert.match(source, /本予約（確定）/)
    assert.match(source, /tone="choice"/)
    assert.equal(/lucide/i.test(source), false)
  })
})
