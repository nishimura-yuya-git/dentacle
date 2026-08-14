import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

describe('SettingsHubNav', () => {
  it('見出し右の4択は SegmentedControl を使う', () => {
    const source = readFileSync(join(here, 'SettingsHubNav.tsx'), 'utf8')
    assert.match(source, /SegmentedControl/)
    assert.match(source, /ariaLabel="設定の表示"/)
    assert.equal(source.includes('bg-[#008C01]/10'), false)
    assert.equal(source.includes("from '@/components/ui/Select'"), false)
  })
})
