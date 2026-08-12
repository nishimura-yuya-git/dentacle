import assert from 'node:assert/strict'
import { buildLocalProposeSlots } from './buildLocalProposeSlots.ts'
import type { ProposeJobSnapshot, ProposePatientSnapshot } from './types.ts'

function patient(
  partial: Partial<ProposePatientSnapshot> &
    Pick<ProposePatientSnapshot, 'patientId' | 'areaLabel'>,
): ProposePatientSnapshot {
  return {
    facilityId: null,
    hasCoordinates: false,
    latitude: null,
    longitude: null,
    preferredWeekdays: [],
    durationMinutes: 20,
    requiresDoctor: false,
    priority: 100,
    phoneConfirmationRequired: true,
    visitFrequency: 'monthly',
    lastVisitDate: null,
    nextDueDate: null,
    dueUrgencyDays: 10,
    dueStatus: 'due_soon',
    ...partial,
  }
}

const patients = [
  patient({ patientId: 'a1', areaLabel: '北' }),
  patient({ patientId: 'a2', areaLabel: '北' }),
  patient({ patientId: 'a3', areaLabel: '北' }),
  patient({ patientId: 'b1', areaLabel: '南' }),
  patient({ patientId: 'b2', areaLabel: '南' }),
  patient({ patientId: 'c1', areaLabel: '東' }),
]

const matrix: Record<string, Record<string, number>> = {}
for (const from of patients) {
  matrix[from.patientId] = {}
  for (const to of patients) {
    if (from.patientId === to.patientId) {
      matrix[from.patientId][to.patientId] = 0
    } else if (from.areaLabel === to.areaLabel) {
      matrix[from.patientId][to.patientId] = 8
    } else {
      matrix[from.patientId][to.patientId] = 35
    }
  }
}

const snapshot: ProposeJobSnapshot = {
  schemaVersion: 2,
  clinicId: 'clinic-1',
  targetDate: '2026-08-11',
  introductionLane: 'startup',
  dayStart: '09:00:00',
  dayEnd: '13:00:00',
  maxSlots: 6,
  travelGapMinutes: 10,
  teams: [
    { index: 0, id: 't1', name: '訪問1号車' },
    { index: 1, id: 't2', name: '訪問2号車' },
    { index: 2, id: 't3', name: '訪問3号車' },
  ],
  patients,
  travelMinutesMatrix: matrix,
  excludedWithoutAddress: 0,
}

const slots = buildLocalProposeSlots(snapshot)
assert.ok(slots.length >= 3)
assert.ok(slots.length <= 6)

const teamsUsed = new Set(slots.map((s) => s.teamIndex))
assert.ok(teamsUsed.size >= 2, '並行号車が2台以上になること')

const startsAt900 = slots.filter((s) => s.proposedStart === '09:00:00')
assert.ok(
  startsAt900.length >= 2,
  '複数号車が朝からスタートできること',
)

// 同一号車内は密（次枠が極端に遠くない）
for (const teamIndex of teamsUsed) {
  const teamSlots = slots
    .filter((s) => s.teamIndex === teamIndex)
    .sort((a, b) => a.proposedStart.localeCompare(b.proposedStart))
  for (let i = 1; i < teamSlots.length; i += 1) {
    assert.ok(
      teamSlots[i].proposedStart <= '12:00:00',
      '号車内が稼働帯前半に寄ること',
    )
  }
}

console.log('buildLocalProposeSlots.test.ts: ok')
