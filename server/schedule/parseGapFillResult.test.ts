import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseGapFillResult } from './parseGapFillResult.ts'
import type { GapFillJobSnapshot } from './types.ts'

const snapshot: GapFillJobSnapshot = {
  schemaVersion: 2,
  mode: 'gap_fill',
  clinicId: 'clinic-1',
  targetDate: '2026-08-11',
  introductionLane: 'startup',
  dayStart: '09:30:00',
  dayEnd: '10:30:00',
  maxSlots: 5,
  travelGapMinutes: 15,
  teams: [{ index: 0, id: 'team-1', name: '1号車' }],
  patients: [
    {
      patientId: '11111111-1111-1111-1111-111111111111',
      areaLabel: 'A',
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
      dueUrgencyDays: 0,
      dueStatus: 'scheduled',
      gapProximityMinutes: 12,
    },
  ],
  travelMinutesMatrix: {},
  excludedWithoutAddress: 0,
  windowStart: '09:30:00',
  windowEnd: '10:30:00',
  preferredTeamIndex: 0,
  existingVisits: [],
  anchorPatientIds: [],
  userMessage: '9:30〜10:30でいけそうな人いる？',
}

describe('parseGapFillResult', () => {
  it('warnings 付き候補を返す', () => {
    const text = JSON.stringify({
      slots: [
        {
          patientId: '11111111-1111-1111-1111-111111111111',
          proposedStart: '09:30:00',
          proposedEnd: '10:00:00',
          teamIndex: 0,
          reason: '近いエリア',
          warnings: ['期限はまだ先'],
        },
      ],
    })

    const result = parseGapFillResult(text, snapshot)
    assert.equal(result.candidates.length, 1)
    assert.equal(result.candidates[0]?.reason, '近いエリア')
    assert.deepEqual(result.candidates[0]?.warnings, ['期限はまだ先'])
  })
})
