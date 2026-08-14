import assert from 'node:assert/strict'
import {
  canConfirmTentativeFromDetail,
  shouldOpenDetailOnVisitClick,
} from './visitClickAction.ts'

assert.equal(shouldOpenDetailOnVisitClick('tentative'), true)
assert.equal(shouldOpenDetailOnVisitClick('confirmed'), true)
assert.equal(shouldOpenDetailOnVisitClick('completed'), true)
assert.equal(canConfirmTentativeFromDetail('tentative'), true)
assert.equal(canConfirmTentativeFromDetail('confirmed'), false)
assert.equal(canConfirmTentativeFromDetail('cancelled'), false)

console.log('visitClickAction.test.ts: ok')
