import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildGapFillCandidatesByProximity,
  computeGapProximityMinutes,
  resolveGapFillAnchors,
  sortGapFillPatientsByProximity,
} from './rankGapFillByProximity.ts'
import type { GapFillJobSnapshot, GapFillPatientSnapshot } from './types.ts'

function patient(
  partial: Partial<GapFillPatientSnapshot> & { patientId: string },
): GapFillPatientSnapshot {
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
    dueUrgencyDays: 0,
    dueStatus: 'scheduled',
    gapProximityMinutes: null,
    ...partial,
  }
}

describe('rankGapFillByProximity', () => {
  it('空き枠前後の訪問をアンカーにする', () => {
    const anchors = resolveGapFillAnchors(
      [
        {
          patientId: 'prev',
          start: '08:00:00',
          end: '09:00:00',
          teamIndex: 0,
        },
        {
          patientId: 'next',
          start: '11:00:00',
          end: '11:30:00',
          teamIndex: 0,
        },
        {
          patientId: 'other-team',
          start: '08:30:00',
          end: '09:00:00',
          teamIndex: 1,
        },
      ],
      0,
      '09:30:00',
      '10:30:00',
    )
    assert.deepEqual(anchors, ['prev', 'next'])
  })

  it('行列から最短近接分を取る', () => {
    const minutes = computeGapProximityMinutes(
      'cand',
      ['a', 'b'],
      {
        cand: { a: 40, b: 12 },
        a: { cand: 40 },
        b: { cand: 12 },
      },
    )
    assert.equal(minutes, 12)
  })

  it('近い患者を期限より先に並べる', () => {
    const sorted = sortGapFillPatientsByProximity([
      patient({
        patientId: 'far-overdue',
        gapProximityMinutes: 50,
        dueStatus: 'overdue',
        dueUrgencyDays: 10,
      }),
      patient({
        patientId: 'near-ok',
        gapProximityMinutes: 8,
        dueStatus: 'scheduled',
        dueUrgencyDays: 0,
      }),
    ])
    assert.equal(sorted[0]?.patientId, 'near-ok')
  })

  it('近接候補をスロットとして返す', () => {
    const snapshot: GapFillJobSnapshot = {
      schemaVersion: 2,
      mode: 'gap_fill',
      clinicId: 'c1',
      targetDate: '2026-08-11',
      introductionLane: 'startup',
      dayStart: '09:30:00',
      dayEnd: '10:30:00',
      maxSlots: 2,
      travelGapMinutes: 15,
      teams: [{ index: 0, id: 't1', name: '1号車' }],
      patients: [
        patient({
          patientId: 'near',
          gapProximityMinutes: 10,
          areaLabel: '北区',
          durationMinutes: 30,
        }),
        patient({
          patientId: 'far',
          gapProximityMinutes: 40,
          areaLabel: '南区',
          durationMinutes: 30,
        }),
      ],
      travelMinutesMatrix: {},
      excludedWithoutAddress: 0,
      windowStart: '09:30:00',
      windowEnd: '10:30:00',
      preferredTeamIndex: 0,
      existingVisits: [],
      anchorPatientIds: ['prev'],
      userMessage: '空いている人いる？',
    }

    const candidates = buildGapFillCandidatesByProximity(snapshot)
    assert.equal(candidates.length, 2)
    assert.equal(candidates[0]?.patientId, 'near')
    assert.match(candidates[0]?.reason ?? '', /近い|約10分/)
  })
})
