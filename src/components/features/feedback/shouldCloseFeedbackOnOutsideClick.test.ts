import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { shouldCloseFeedbackOnOutsideClick } from './shouldCloseFeedbackOnOutsideClick.ts'

describe('shouldCloseFeedbackOnOutsideClick', () => {
  it('パネルとFABの外なら閉じる', () => {
    assert.equal(
      shouldCloseFeedbackOnOutsideClick({
        containedByRoot: false,
        containedByIgnoreOutside: false,
      }),
      true,
    )
  })

  it('パネルやFABの中なら閉じない', () => {
    assert.equal(
      shouldCloseFeedbackOnOutsideClick({
        containedByRoot: true,
        containedByIgnoreOutside: false,
      }),
      false,
    )
  })

  it('portal の選択メニューは外側扱いにしない', () => {
    assert.equal(
      shouldCloseFeedbackOnOutsideClick({
        containedByRoot: false,
        containedByIgnoreOutside: true,
      }),
      false,
    )
  })
})
