import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildClinicVisitMenuSeedInserts,
  createCustomMenuCode,
  enabledMapFromMenus,
  fallbackClinicVisitMenus,
  mapClinicVisitMenuRows,
  normalizeMenuName,
  parseDurationMinutes,
  shouldSeedClinicVisitMenus,
} from './clinicVisitMenus.ts'

describe('clinicVisitMenus', () => {
  it('削除済みを含む行が1件でもあれば再コピーしない', () => {
    assert.equal(shouldSeedClinicVisitMenus(0), true)
    assert.equal(shouldSeedClinicVisitMenus(1), false)
    assert.equal(shouldSeedClinicVisitMenus(29), false)
  })

  it('初期コピーは29件で、metadata の OFF を is_enabled に移す', () => {
    const rows = buildClinicVisitMenuSeedInserts({
      clinicId: 'clinic-1',
      metadata: { visit_menu_enabled: { extraction: false } },
      userId: 'user-1',
    })
    assert.equal(rows.length, 29)
    const extraction = rows.find((row) => row.code === 'extraction')
    const firstVisit = rows.find((row) => row.code === 'first-visit')
    assert.equal(extraction?.is_enabled, false)
    assert.equal(firstVisit?.is_enabled, true)
    assert.equal(firstVisit?.duration_minutes, 40)
    assert.equal(rows[0]?.sort_order, 0)
  })

  it('名称と所要を検証する', () => {
    assert.equal(normalizeMenuName('  抜歯  '), '抜歯')
    assert.equal(parseDurationMinutes('25'), 25)
    assert.equal(parseDurationMinutes('0'), null)
    assert.equal(parseDurationMinutes('481'), null)
    assert.equal(parseDurationMinutes('12.5'), null)
    assert.equal(createCustomMenuCode('abc'), 'custom-abc')
  })

  it('OFF だけ enabled map に残し、行を画面用に写す', () => {
    assert.deepEqual(
      enabledMapFromMenus([
        { code: 'extraction', isEnabled: false },
        { code: 'first-visit', isEnabled: true },
      ]),
      { extraction: false },
    )
    const mapped = mapClinicVisitMenuRows([
      {
        id: '1',
        code: 'oral-care',
        name: '口腔ケア',
        duration_minutes: 15,
        is_enabled: true,
        sort_order: 2,
      },
    ])
    assert.deepEqual(mapped, [
      {
        id: '1',
        code: 'oral-care',
        name: '口腔ケア',
        durationMinutes: 15,
        isEnabled: true,
        sortOrder: 2,
      },
    ])
  })

  it('未コピー時のフォールバックはコード29件と metadata OFF', () => {
    const items = fallbackClinicVisitMenus({
      visit_menu_enabled: { extraction: false },
    })
    assert.equal(items.length, 29)
    assert.equal(items[0]?.code, 'extraction')
    assert.equal(items[0]?.isEnabled, false)
    assert.equal(items.find((item) => item.code === 'first-visit')?.isEnabled, true)
  })
})
