import assert from 'node:assert/strict'
import {
  shouldStopForAccuracy,
  validateProposeResult,
} from './validateProposeResult.ts'
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
  targetDate: '2026-08-11', // 火曜日 = 2
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
      preferredWeekdays: [1],
      priority: 20,
      phoneConfirmationRequired: false,
    }),
    patient({
      patientId: 'p3',
      areaLabel: '南区',
      durationMinutes: 45,
      priority: 30,
    }),
  ],
  travelMinutesMatrix: {
    p1: { p1: 0, p2: 10, p3: 60 },
    p2: { p1: 10, p2: 0, p3: 55 },
    p3: { p1: 60, p2: 55, p3: 0 },
  },
  excludedWithoutAddress: 0,
}

{
  const report = validateProposeResult(
    {
      slots: [
        {
          patientId: 'p1',
          proposedStart: '09:00:00',
          proposedEnd: '09:30:00',
          teamIndex: 0,
        },
        {
          patientId: 'p2',
          proposedStart: '09:45:00',
          proposedEnd: '10:15:00',
          teamIndex: 0,
        },
      ],
    },
    snapshot,
  )
  assert.equal(report.acceptedCount, 2)
  assert.equal(report.hardDroppedCount, 0)
  assert.ok(report.issues.some((i) => i.code === 'preferred_weekday'))
  assert.equal(shouldStopForAccuracy(report).stop, false)
}

{
  const report = validateProposeResult(
    {
      slots: [
        {
          patientId: 'p1',
          proposedStart: '08:00:00',
          proposedEnd: '08:30:00',
          teamIndex: 0,
        },
        {
          patientId: 'p3',
          proposedStart: '09:00:00',
          proposedEnd: '09:30:00',
          teamIndex: 0,
        },
      ],
    },
    snapshot,
  )
  assert.equal(report.acceptedCount, 0)
  assert.ok(report.issues.some((i) => i.code === 'outside_day_window'))
  assert.ok(report.issues.some((i) => i.code === 'duration_mismatch'))
  assert.equal(shouldStopForAccuracy(report).stop, true)
}

{
  const report = validateProposeResult(
    {
      slots: [
        {
          patientId: 'p1',
          proposedStart: '09:00:00',
          proposedEnd: '09:30:00',
          teamIndex: 0,
        },
        {
          patientId: 'p2',
          proposedStart: '09:15:00',
          proposedEnd: '09:45:00',
          teamIndex: 0,
        },
      ],
    },
    snapshot,
  )
  assert.equal(report.acceptedCount, 1)
  assert.ok(report.issues.some((i) => i.code === 'team_overlap'))
}

{
  const report = validateProposeResult(
    {
      slots: [
        {
          patientId: 'p1',
          proposedStart: '09:00:00',
          proposedEnd: '09:30:00',
          teamIndex: 0,
        },
        {
          patientId: 'p2',
          proposedStart: '09:35:00',
          proposedEnd: '10:05:00',
          teamIndex: 0,
        },
      ],
    },
    snapshot,
  )
  assert.equal(report.acceptedCount, 2)
  assert.ok(report.issues.some((i) => i.code === 'travel_gap'))
}

{
  const report = validateProposeResult(
    {
      slots: [
        {
          patientId: 'p1',
          proposedStart: '09:00:00',
          proposedEnd: '09:30:00',
          teamIndex: 0,
        },
        {
          patientId: 'p3',
          proposedStart: '09:45:00',
          proposedEnd: '10:30:00',
          teamIndex: 0,
        },
      ],
    },
    snapshot,
  )
  assert.equal(report.acceptedCount, 2)
  assert.ok(report.issues.some((i) => i.code === 'travel_jump'))
}

console.log('validateProposeResult.test.ts: ok')
