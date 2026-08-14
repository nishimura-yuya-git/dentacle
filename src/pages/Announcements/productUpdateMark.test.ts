import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  defaultProductUpdateMark,
  formatProductUpdateMarkLabel,
  isProductUpdateMark,
  PRODUCT_UPDATE_MARKS,
  PRODUCT_UPDATE_MARK_OPTIONS,
  productUpdateMarkSrc,
  resolveProductUpdateMark,
} from './productUpdateMark.ts'

describe('defaultProductUpdateMark', () => {
  it('修正はリンク、それ以外は月', () => {
    assert.equal(defaultProductUpdateMark('fix'), 'note')
    assert.equal(defaultProductUpdateMark('feature'), 'sparkle')
    assert.equal(defaultProductUpdateMark('improve'), 'sparkle')
  })
})

describe('resolveProductUpdateMark', () => {
  it('指定があれば種類より優先する', () => {
    assert.equal(resolveProductUpdateMark('calendar', 'fix'), 'calendar')
    assert.equal(resolveProductUpdateMark('unknown', 'fix'), 'note')
    assert.equal(resolveProductUpdateMark(null, 'feature'), 'sparkle')
  })
})

describe('formatProductUpdateMarkLabel', () => {
  it('日本語ラベルを返す。英語キーは出さない', () => {
    assert.equal(formatProductUpdateMarkLabel('sparkle'), '月')
    assert.equal(formatProductUpdateMarkLabel('note'), 'リンク')
    assert.equal(formatProductUpdateMarkLabel('calendar'), 'ピン')
    assert.equal(formatProductUpdateMarkLabel('optimization'), 'フォルダ')
    assert.equal(formatProductUpdateMarkLabel('solution'), '火')
    assert.equal(PRODUCT_UPDATE_MARKS.includes('sparkle'), true)
    assert.equal(isProductUpdateMark('WIP'), false)
  })
})

describe('productUpdateMarkSrc', () => {
  it('表示は public/icon/news を使う', () => {
    for (const mark of PRODUCT_UPDATE_MARKS) {
      assert.match(productUpdateMarkSrc(mark), /^\/icon\/news\//)
    }
  })

  it('リンクは file-text ではなく実在する link 画像を使う', () => {
    assert.equal(productUpdateMarkSrc('note'), '/icon/news/3dicons-link-dynamic-color.png')
  })

  it('選択UIは news の5つだけ出す', () => {
    assert.deepEqual(
      PRODUCT_UPDATE_MARK_OPTIONS.map((option) => option.value),
      ['sparkle', 'note', 'calendar', 'optimization', 'solution'],
    )
  })
})
