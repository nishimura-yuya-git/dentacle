import assert from 'node:assert/strict'
import { visitBlockStyle } from './calendarGrid.ts'
import {
  isAutoProposalTentative,
  planVisitCardLayout,
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
assert.match(
  visitBlockClassName({ status: 'confirmed', source: 'manual', cell_color: 'orange' }),
  /bg-orange-50/,
)
assert.match(
  visitBlockClassName({ status: 'tentative', source: 'auto_proposal', cell_color: 'sky' }),
  /border-dashed/,
)
assert.match(
  visitBlockClassName({ status: 'tentative', source: 'auto_proposal', cell_color: 'sky' }),
  /bg-sky-50/,
)
assert.match(
  visitBlockClassName({
    status: 'confirmed',
    source: 'manual',
    cell_color: 'orange',
    has_infectious_disease: true,
  }),
  /bg-slate-800/,
)
assert.doesNotMatch(
  visitBlockClassName({
    status: 'confirmed',
    source: 'manual',
    cell_color: 'orange',
    has_infectious_disease: true,
  }),
  /bg-orange-50/,
)
assert.match(
  visitBlockClassName({
    status: 'tentative',
    source: 'auto_proposal',
    cell_color: 'sky',
    patients: { has_infectious_disease: true },
  }),
  /bg-slate-800/,
)

assert.equal(provisionalBlockHeightPx(54), 64)
assert.equal(provisionalStatusLabel(64), '仮（クリックで詳細）')
assert.equal(provisionalStatusLabel(40), '仮')

const shortCard = planVisitCardLayout(visitBlockStyle('10:00', '10:25').height, true)
assert.equal(shortCard.showTreatment, true)
assert.equal(shortCard.statusOnOwnLine, false)

const halfHour = planVisitCardLayout(visitBlockStyle('10:00', '10:30').height, true)
assert.equal(halfHour.showTreatment, true)
assert.equal(halfHour.statusOnOwnLine, false)

const longCard = planVisitCardLayout(visitBlockStyle('10:00', '10:40').height, true)
assert.equal(longCard.showTreatment, true)
assert.equal(longCard.statusOnOwnLine, true)

const noMenu = planVisitCardLayout(visitBlockStyle('10:00', '10:25').height, false)
assert.equal(noMenu.showTreatment, false)
assert.equal(noMenu.statusOnOwnLine, true)

console.log('visitBlockAppearance.test.ts: ok')
