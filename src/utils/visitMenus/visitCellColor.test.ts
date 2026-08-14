import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  DEFAULT_VISIT_CELL_COLOR,
  VISIT_CELL_COLOR_OPTIONS,
  readVisitCellColor,
  visitCellColorOption,
  withVisitCellColor,
} from './visitCellColor.ts'

describe('visitCellColor', () => {
  it('5色で、未設定は緑', () => {
    assert.equal(VISIT_CELL_COLOR_OPTIONS.length, 5)
    assert.deepEqual(
      VISIT_CELL_COLOR_OPTIONS.map((item) => item.label),
      ['緑', '黄', '橙', '青', '灰'],
    )
    assert.equal(readVisitCellColor(null), DEFAULT_VISIT_CELL_COLOR)
    assert.equal(readVisitCellColor({ visit_menus: [] }), 'green')
  })

  it('保存した色を読み、メニュー情報は消さない', () => {
    const next = withVisitCellColor({ visit_menus: [{ slot: '1' }] }, 'orange')
    assert.equal(readVisitCellColor(next as never), 'orange')
    assert.ok(Array.isArray(next.visit_menus))
    assert.equal(visitCellColorOption('orange').fillClass, 'bg-orange-50')
  })

  it('未知の値は緑に戻す', () => {
    assert.equal(readVisitCellColor({ cell_color: 'pink' }), 'green')
  })
})
