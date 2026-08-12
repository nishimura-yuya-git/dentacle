import assert from 'node:assert/strict'
import {
  DEFAULT_INTRODUCTION_LANE,
  getProposalLanePreset,
  isIntroductionLane,
} from './proposalLanePresets.ts'

assert.equal(isIntroductionLane('startup'), true)
assert.equal(isIntroductionLane('existing'), true)
assert.equal(isIntroductionLane('other'), false)
assert.equal(DEFAULT_INTRODUCTION_LANE, 'startup')

const startup = getProposalLanePreset('startup')
const existing = getProposalLanePreset('existing')
assert.ok(startup.maxSlots < existing.maxSlots)
assert.ok(startup.dayEnd < existing.dayEnd)
assert.equal(startup.label, '立ち上げ')
assert.equal(existing.label, '既存導入')

console.log('proposalLanePresets.test.ts: ok')
