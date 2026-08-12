import assert from 'node:assert/strict'
import { packProposeSlots } from './packProposeSlots.ts'
import type {
  ProposeJobSnapshot,
  ProposePatientSnapshot,
  ProposeSlotResult,
} from './types.ts'

function patient(
  partial: Partial<ProposePatientSnapshot> &
    Pick<ProposePatientSnapshot, 'patientId'>,
): ProposePatientSnapshot {
  return {
    areaLabel: null,
    facilityId: null,
    hasCoordinates: false,
    latitude: null,
    longitude: null,
    preferredWeekdays: [],
    durationMinutes: 30,
    requiresDoctor: false,
    priority: 100,
    phoneConfirmationRequired: true,
    visitFrequency: 'monthly',
    lastVisitDate: null,
    nextDueDate: null,
    dueUrgencyDays: null,
    dueStatus: 'unknown',
    ...partial,
  }
}

const snapshot: ProposeJobSnapshot = {
  schemaVersion: 2,
  clinicId: 'clinic-1',
  targetDate: '2026-08-11',
  introductionLane: 'startup',
  dayStart: '09:00:00',
  dayEnd: '13:00:00',
  maxSlots: 10,
  travelGapMinutes: 15,
  teams: [
    { index: 0, id: 't1', name: '訪問1号車' },
    { index: 1, id: 't2', name: '訪問2号車' },
    { index: 2, id: 't3', name: '訪問3号車' },
  ],
  patients: [
    patient({ patientId: 'p1', areaLabel: 'A' }),
    patient({ patientId: 'p2', areaLabel: 'A' }),
    patient({ patientId: 'p3', areaLabel: 'B' }),
    patient({ patientId: 'p4', areaLabel: 'B', durationMinutes: 20 }),
  ],
  travelMinutesMatrix: {
    p1: { p2: 10, p3: 40 },
    p2: { p1: 10, p3: 20 },
    p3: { p1: 40, p2: 20, p4: 10 },
    p4: { p3: 10 },
  },
  excludedWithoutAddress: 0,
}

// 並行ルート: 同時刻スタートを号車ごとに維持する
const parallelSlots: ProposeSlotResult[] = [
  {
    patientId: 'p1',
    proposedStart: '09:00:00',
    proposedEnd: '09:30:00',
    teamIndex: 0,
    reason: '1号車',
  },
  {
    patientId: 'p2',
    proposedStart: '09:00:00',
    proposedEnd: '09:30:00',
    teamIndex: 1,
    reason: '2号車',
  },
  {
    patientId: 'p3',
    proposedStart: '09:00:00',
    proposedEnd: '09:30:00',
    teamIndex: 2,
    reason: '3号車',
  },
]

const parallelPacked = packProposeSlots(parallelSlots, snapshot)
assert.equal(parallelPacked.length, 3)
assert.deepEqual(
  parallelPacked.map((s) => s.teamIndex).sort(),
  [0, 1, 2],
)
assert.ok(parallelPacked.every((s) => s.proposedStart === '09:00:00'))
assert.ok(parallelPacked.every((s) => s.proposedEnd === '09:30:00'))

// 同一号車内は移動ギャップで密に詰める（薄い格子を潰す）
const sparseSameCar: ProposeSlotResult[] = [
  {
    patientId: 'p3',
    proposedStart: '09:00:00',
    proposedEnd: '09:30:00',
    teamIndex: 1,
  },
  {
    patientId: 'p4',
    proposedStart: '11:00:00',
    proposedEnd: '11:20:00',
    teamIndex: 1,
  },
]
const dense = packProposeSlots(sparseSameCar, snapshot)
assert.equal(dense.length, 2)
assert.equal(dense[0].teamIndex, 1)
assert.equal(dense[0].proposedStart, '09:00:00')
assert.equal(dense[0].proposedEnd, '09:30:00')
assert.equal(dense[1].teamIndex, 1)
// max(15, 10) = 15 → 09:45 開始
assert.equal(dense[1].proposedStart, '09:45:00')
assert.equal(dense[1].proposedEnd, '10:05:00')

console.log('packProposeSlots.test.ts: ok')
