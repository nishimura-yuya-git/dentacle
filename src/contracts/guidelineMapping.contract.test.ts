import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  GUIDELINE_MAPPING_ROWS,
  GUIDELINE_STANCE,
  hasGuidelineCompliantClaim,
  listGuidelineRowsByStatus,
} from './guidelineMapping.contract.ts'

const here = dirname(fileURLToPath(import.meta.url))

describe('guidelineMapping.contract', () => {
  it('姿勢は取り入れであり、準拠済み判定は持たない', () => {
    assert.equal(GUIDELINE_STANCE, 'design_to_comply')
    assert.equal(hasGuidelineCompliantClaim(), false)
    assert.ok(listGuidelineRowsByStatus('pending_decision').length >= 3)
    assert.ok(listGuidelineRowsByStatus('implemented_design').length >= 6)
    assert.ok(
      GUIDELINE_MAPPING_ROWS.every((row) => row.status !== ('compliant' as string)),
    )
  })

  it('院向けに準拠済みと書かず、突合ドキュメントは契約IDを持つ', () => {
    const privacy = readFileSync(join(here, '../pages/Security/privacyCopy.ts'), 'utf8')
    const doc = readFileSync(join(here, '../../docs/compliance/ガイドライン突合.md'), 'utf8')
    assert.equal(/準拠しています/.test(privacy), false)
    for (const row of GUIDELINE_MAPPING_ROWS) {
      assert.match(doc, new RegExp(row.id))
    }
  })
})
