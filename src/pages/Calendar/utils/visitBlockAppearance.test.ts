import assert from 'node:assert/strict'
import {
  isAutoProposalTentative,
  provisionalBlockHeightPx,
  provisionalStatusLabel,
  visitBlockClassName,
} from './visitBlockAppearance.ts'

assert.equal(
  isAutoProposalTentative({ status: 'tentative', source: 'auto_proposal' }),
  true,
)
assert.equal(
  isAutoProposalTentative({ status: 'tentative', source: 'manual' }),
  false,
)
assert.equal(
  isAutoProposalTentative({ status: 'confirmed', source: 'auto_proposal' }),
  false,
)

assert.match(
  visitBlockClassName({ status: 'tentative', source: 'auto_proposal' }),
  /border-dashed/,
)
assert.doesNotMatch(
  visitBlockClassName({ status: 'confirmed', source: 'auto_proposal' }),
  /border-dashed/,
)

assert.equal(provisionalBlockHeightPx(54), 64)
assert.equal(provisionalStatusLabel(64), '仮（クリックで確定）')
assert.equal(provisionalStatusLabel(40), '仮')

console.log('visitBlockAppearance.test.ts: ok')
