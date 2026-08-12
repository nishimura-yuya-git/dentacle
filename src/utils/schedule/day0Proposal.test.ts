import assert from 'node:assert/strict'
import { buildDay0Proposal, type ProposalPatient } from './day0Proposal.ts'

function makePatients(count: number): ProposalPatient[] {
  return Array.from({ length: count }, (_, index) => ({
    patientId: `p${index + 1}`,
    name: `患者${index + 1}`,
    areaLabel: index % 2 === 0 ? '東' : '西',
    facilityId: null,
    preferredWeekdays: [],
    durationMinutes: 30,
    requiresDoctor: false,
    priority: index + 1,
  }))
}

const many = makePatients(50)

const startupSlots = buildDay0Proposal({
  targetDate: '2026-08-10',
  patients: many,
  lane: 'startup',
})
assert.ok(startupSlots.length <= 10)
assert.ok(startupSlots.length > 0)
assert.ok(startupSlots.every((slot) => slot.proposedEnd <= '13:00:00'))

const existingSlots = buildDay0Proposal({
  targetDate: '2026-08-10',
  patients: many,
  lane: 'existing',
})
assert.ok(existingSlots.length > startupSlots.length)
assert.ok(existingSlots.length <= 36)
assert.ok(existingSlots.every((slot) => slot.proposedEnd <= '18:00:00'))

console.log('day0Proposal.test.ts: ok')
