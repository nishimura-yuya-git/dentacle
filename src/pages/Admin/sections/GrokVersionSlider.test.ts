import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { GROK_VERSION_SELECT_OPTIONS } from '../../../config/aiModelOptions.ts'
import { shouldCommitGrokSliderOnPhase } from './modelSwitcherUx.ts'

describe('GrokVersionSlider の段階', () => {
  it('4.5 と 4.6 の2段階だけで、3段階や詳細設定は置かない', () => {
    assert.deepEqual(
      GROK_VERSION_SELECT_OPTIONS.map((option) => option.label),
      ['4.5（おすすめ）', '4.6'],
    )
    assert.equal(GROK_VERSION_SELECT_OPTIONS.length, 2)
  })

  it('押した瞬間は確定せず、離したときだけ確定する', () => {
    assert.equal(shouldCommitGrokSliderOnPhase('down'), false)
    assert.equal(shouldCommitGrokSliderOnPhase('up'), true)
  })
})
