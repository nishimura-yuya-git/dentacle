import assert from 'node:assert/strict'
import { parseProposeResult } from './parseProposeResult.ts'
import type { ProposeJobSnapshot, ProposePatientSnapshot } from './types.ts'

function patient(
  partial: Partial<ProposePatientSnapshot> & Pick<ProposePatientSnapshot, 'patientId'>,
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
    { index: 0, id: 'team-a', name: '1号車' },
    { index: 1, id: 'team-b', name: '2号車' },
  ],
  patients: [
    patient({
      patientId: 'p1',
      areaLabel: '北区',
      preferredWeekdays: [2],
      priority: 10,
    }),
    patient({
      patientId: 'p2',
      areaLabel: '北区',
      priority: 20,
      phoneConfirmationRequired: false,
    }),
  ],
  travelMinutesMatrix: {
    p1: { p1: 0, p2: 10 },
    p2: { p1: 10, p2: 0 },
  },
  excludedWithoutAddress: 0,
}

{
  const parsed = parseProposeResult(
    JSON.stringify({
      slots: [
        {
          patientId: 'p1',
          proposedStart: '9:00',
          proposedEnd: '09:30',
          teamIndex: 0,
          reason: 'エリア連続',
        },
        {
          patientId: 'unknown',
          proposedStart: '10:00:00',
          proposedEnd: '10:30:00',
        },
        {
          patientId: 'p2',
          proposedStart: '10:00:00',
          proposedEnd: '09:00:00',
        },
      ],
    }),
    snapshot,
  )
  assert.equal(parsed.slots.length, 1)
  assert.equal(parsed.slots[0].patientId, 'p1')
  assert.equal(parsed.slots[0].proposedStart, '09:00:00')
}

{
  const parsed = parseProposeResult(
    '説明文\n```json\n{"slots":[{"patientId":"p2","proposedStart":"10:00:00","proposedEnd":"10:30:00","teamIndex":1}]}\n```\n以上',
    snapshot,
  )
  assert.equal(parsed.slots.length, 1)
  assert.equal(parsed.slots[0].teamIndex, 1)
}

console.log('parseProposeResult.test.ts: ok')
