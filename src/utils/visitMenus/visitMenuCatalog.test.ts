import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  VISIT_MENU_CATALOG,
  findVisitMenu,
  formatVisitMenuLabel,
} from './visitMenuCatalog.ts'

describe('VISIT_MENU_CATALOG', () => {
  it('添付の29件で、code は一意', () => {
    assert.equal(VISIT_MENU_CATALOG.length, 29)
    const codes = VISIT_MENU_CATALOG.map((item) => item.code)
    assert.equal(new Set(codes).size, 29)
  })

  it('表示は「名称 (N分)」で、初診は40分', () => {
    const firstVisit = findVisitMenu('first-visit')
    assert.ok(firstVisit)
    assert.equal(firstVisit.name, '初診')
    assert.equal(firstVisit.durationMinutes, 40)
    assert.equal(formatVisitMenuLabel(firstVisit), '初診 (40分)')
  })

  it('添付どおりの先頭・末尾・嚥下初診を持つ', () => {
    assert.equal(VISIT_MENU_CATALOG[0]?.name, '抜歯')
    assert.equal(VISIT_MENU_CATALOG[0]?.durationMinutes, 25)
    assert.equal(VISIT_MENU_CATALOG.at(-1)?.name, '引継ぎ有り')
    assert.equal(findVisitMenu('swallow-first-visit')?.durationMinutes, 60)
  })
})
