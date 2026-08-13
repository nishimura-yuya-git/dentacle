import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { placeAccountMenu } from './placeAccountMenu.ts'

describe('placeAccountMenu', () => {
  it('安全性左レールのようにトリガーが画面下端なら上に開き、メニュー全体がビューポート内に収まる', () => {
    const result = placeAccountMenu({
      trigger: { top: 760, right: 281, bottom: 792, left: 249, width: 32, height: 32 },
      menuWidth: 280,
      menuHeight: 440,
      viewportWidth: 1280,
      viewportHeight: 800,
    })

    assert.equal(result.openUp, true)
    assert.equal(result.top, null)
    assert.ok(result.bottom !== null)
    const menuBottom = 800 - (result.bottom ?? 0)
    const menuTop = menuBottom - Math.min(440, result.maxHeight)
    assert.ok(menuTop >= 8)
    assert.ok(menuBottom <= 760)
    assert.ok(result.maxHeight >= 440)
    assert.ok(result.left >= 8)
    assert.ok(result.left + result.width <= 1280 - 8)
  })

  it('ヘッダー右端のようにトリガーが画面上端なら下に開く', () => {
    const result = placeAccountMenu({
      trigger: { top: 10, right: 1264, bottom: 42, left: 1232, width: 32, height: 32 },
      menuWidth: 280,
      menuHeight: 440,
      viewportWidth: 1280,
      viewportHeight: 800,
    })

    assert.equal(result.openUp, false)
    assert.equal(result.top, 50)
    assert.equal(result.bottom, null)
    assert.ok((result.top ?? 0) + Math.min(440, result.maxHeight) <= 800 - 8)
    assert.ok(result.left + result.width <= 1280 - 8)
  })

  it('上下どちらも足りないときは高さを縮めてビューポート内に収める', () => {
    const result = placeAccountMenu({
      trigger: { top: 180, right: 280, bottom: 212, left: 248, width: 32, height: 32 },
      menuWidth: 280,
      menuHeight: 440,
      viewportWidth: 1280,
      viewportHeight: 400,
    })

    assert.ok(result.maxHeight < 440)
    if (result.openUp) {
      const menuBottom = 400 - (result.bottom ?? 0)
      assert.ok(menuBottom - result.maxHeight >= 8)
      assert.ok(menuBottom <= 180)
    } else {
      assert.ok((result.top ?? 0) >= 8)
      assert.ok((result.top ?? 0) + result.maxHeight <= 400 - 8)
    }
  })
})
