import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  shouldCloseModelSwitcherAfterSave,
  shouldCommitGrokSliderOnPhase,
} from './modelSwitcherUx.ts'

describe('modelSwitcherUx', () => {
  it('保存成功でもパネルを閉じない', () => {
    assert.equal(shouldCloseModelSwitcherAfterSave(), false)
  })

  it('スライダーは押下・移動では確定せず、離したときだけ確定する', () => {
    assert.equal(shouldCommitGrokSliderOnPhase('down'), false)
    assert.equal(shouldCommitGrokSliderOnPhase('move'), false)
    assert.equal(shouldCommitGrokSliderOnPhase('up'), true)
  })
})
