import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { timeToSeconds } from '../../src/utils/schedule/proposalLanePresets.ts'
import {
  freeWindowsForTeam,
  intervalsOverlap,
  normalizeOccupiedHms,
  occupiedVisitsForTeam,
  slotOverlapsOccupied,
} from './occupiedProposeSlots.ts'
import type { OccupiedVisit } from './types.ts'

const occupied: OccupiedVisit[] = [
  { patientId: 'locked', start: '10:00:00', end: '10:30:00', teamIndex: 0 },
  { patientId: 'other-car', start: '10:00:00', end: '10:30:00', teamIndex: 1 },
]

describe('occupiedProposeSlots', () => {
  it('時刻を HH:mm:ss に揃える', () => {
    assert.equal(normalizeOccupiedHms('9:00'), '09:00:00')
    assert.equal(normalizeOccupiedHms('10:30:00'), '10:30:00')
  })

  it('同一号車の既存枠だけを見る', () => {
    assert.equal(occupiedVisitsForTeam(occupied, 0).length, 1)
    assert.equal(occupiedVisitsForTeam(occupied, 0)[0]?.patientId, 'locked')
    assert.equal(occupiedVisitsForTeam(undefined, 0).length, 0)
  })

  it('重なり判定は端点接触を重ならないとみなす', () => {
    assert.equal(intervalsOverlap(0, 30, 30, 60), false)
    assert.equal(intervalsOverlap(0, 31, 30, 60), true)
  })

  it('同じ号車の確定枠と重なる提案を見つける', () => {
    const hit = slotOverlapsOccupied({
      teamIndex: 0,
      start: '10:15:00',
      end: '10:45:00',
      occupied,
    })
    assert.equal(hit?.patientId, 'locked')
    assert.equal(
      slotOverlapsOccupied({
        teamIndex: 1,
        start: '09:00:00',
        end: '09:30:00',
        occupied,
      }),
      null,
    )
  })

  it('確定枠の前後に移動ギャップを残した空き帯を返す', () => {
    const windows = freeWindowsForTeam({
      dayStartSec: timeToSeconds('09:00:00'),
      dayEndSec: timeToSeconds('13:00:00'),
      occupied,
      teamIndex: 0,
      travelGapMinutes: 15,
    })
    assert.deepEqual(windows, [
      {
        startSec: timeToSeconds('09:00:00'),
        endSec: timeToSeconds('09:45:00'),
      },
      {
        startSec: timeToSeconds('10:45:00'),
        endSec: timeToSeconds('13:00:00'),
      },
    ])
  })
})
