import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  extractProposeMemorySections,
  loadProposeMemorySections,
  PROPOSE_MEMORY_SECTION_IDS,
} from './loadProposeMemorySections.ts'

const root = process.cwd()
const md = readFileSync(join(root, 'PROJECT_MEMORY.md'), 'utf8')
const extracted = extractProposeMemorySections(md)

assert.match(extracted, /### 6\.8 /)
assert.match(extracted, /### 6\.48 /)
assert.match(extracted, /### 6\.13 /)
assert.ok(!extracted.includes('### 6.21 '), 'ログインUI節は抽出しない')
assert.ok(!extracted.includes('### 6.24 '), 'ヘッダーUI節は抽出しない')

for (const id of ['6.8', '6.48', '6.39'] as const) {
  assert.ok(
    PROPOSE_MEMORY_SECTION_IDS.includes(id),
    `${id} が抽出リストにあること`,
  )
}

const loaded = loadProposeMemorySections({ cwd: root })
assert.ok(loaded)
assert.ok(loaded!.text.includes('### 6.8 '))

console.log('loadProposeMemorySections.test.ts: ok')
