import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { estimateSelectMenuWidth, placeSelectMenu } from './placeSelectMenu.ts'

describe('estimateSelectMenuWidth', () => {
  it('短いラベルはトリガー幅を維持する', () => {
    assert.equal(estimateSelectMenuWidth(['すべて'], 176, 1280), 176)
  })

  it('長い院名はトリガーより広くする', () => {
    const width = estimateSelectMenuWidth(
      ['すべてのクリニック', '医療法人社団　立靖会　ひまわり歯科クリニック'],
      176,
      1280,
    )
    assert.ok(width > 176)
    assert.ok(width <= 480)
  })

  it('画面幅を超えない', () => {
    const width = estimateSelectMenuWidth(
      ['医療法人社団　立靖会　ひまわり歯科クリニック本院'],
      176,
      320,
    )
    assert.ok(width <= 304)
  })
})

describe('placeSelectMenu', () => {
  const trigger = {
    left: 1100,
    right: 1276,
    top: 80,
    bottom: 112,
    width: 176,
  }

  it('右端のトリガーではメニューを左へずらして画面内に収める', () => {
    const style = placeSelectMenu(
      trigger,
      { width: 1280, height: 800 },
      2,
      ['すべてのクリニック', '医療法人社団　立靖会　ひまわり歯科クリニック'],
    )
    assert.ok(style.left + style.width <= 1272)
    assert.ok(style.left >= 8)
    assert.ok(style.left < trigger.left)
  })

  it('左端の短いメニューはトリガー左に揃える', () => {
    const style = placeSelectMenu(
      { left: 24, right: 200, top: 80, bottom: 112, width: 176 },
      { width: 1280, height: 800 },
      2,
      ['すべて'],
    )
    assert.equal(style.left, 24)
    assert.equal(style.width, 176)
  })
})
