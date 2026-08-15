import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sortPublishedProductUpdates } from './sortProductUpdates.ts'

const here = dirname(fileURLToPath(import.meta.url))

describe('sortPublishedProductUpdates', () => {
  it('公開日が新しくても通し番号の小さい件は下にする', () => {
    const sorted = sortPublishedProductUpdates([
      { updateNumber: 1, publishedAt: '2026-08-13T03:00:00.000Z' },
      { updateNumber: 2, publishedAt: '2026-08-12T04:00:00.000Z' },
      { updateNumber: 3, publishedAt: '2026-08-10T05:00:00.000Z' },
    ])
    assert.deepEqual(
      sorted.map((item) => item.updateNumber),
      [3, 2, 1],
    )
  })

  it('通し番号が同じときは公開日時の新しい件を上にする', () => {
    const sorted = sortPublishedProductUpdates([
      { updateNumber: 4, publishedAt: '2026-08-01T00:00:00.000Z' },
      { updateNumber: 4, publishedAt: '2026-08-02T00:00:00.000Z' },
    ])
    assert.equal(sorted[0]?.publishedAt, '2026-08-02T00:00:00.000Z')
  })

  it('お知らせ一覧は通し番号降順のSSoTを使う', () => {
    const source = readFileSync(join(here, 'hooks/useProductUpdates.ts'), 'utf8')
    assert.match(source, /sortPublishedProductUpdates/)
    assert.equal(source.includes("localeCompare(a.publishedAt"), false)
  })
})
