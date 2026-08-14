import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

describe('IntroductionLaneSection', () => {
  it('立ち上げ／既存導入は見出しタブと同じ SegmentedControl にする', () => {
    const source = readFileSync(join(here, 'IntroductionLaneSection.tsx'), 'utf8')
    assert.match(source, /SegmentedControl/)
    assert.match(source, /立ち上げ/)
    assert.match(source, /既存導入/)
    assert.equal(source.includes('bg-[#008C01]/10'), false)
    assert.equal(source.includes('laneButtonClass'), false)
  })
})
