import assert from 'node:assert/strict'
import { buildProposePrompt } from './buildProposePrompt.ts'
import type { ProposeJobSnapshot } from './types.ts'

const snapshot: ProposeJobSnapshot = {
  schemaVersion: 2,
  clinicId: 'c1',
  targetDate: '2026-08-10',
  introductionLane: 'startup',
  dayStart: '09:00:00',
  dayEnd: '13:00:00',
  maxSlots: 10,
  travelGapMinutes: 15,
  teams: [{ index: 0, id: 't1', name: '訪問1号車' }],
  patients: [
    {
      patientId: 'p1',
      areaLabel: '北',
      facilityId: null,
      hasCoordinates: false,
      latitude: null,
      longitude: null,
      preferredWeekdays: [],
      durationMinutes: 30,
      requiresDoctor: false,
      priority: 1,
      phoneConfirmationRequired: true,
      visitFrequency: 'monthly',
      lastVisitDate: null,
      nextDueDate: null,
      dueUrgencyDays: 5,
      dueStatus: 'due_soon',
    },
  ],
  travelMinutesMatrix: { p1: {} },
  excludedWithoutAddress: 0,
}

const prompt = buildProposePrompt(snapshot, { cwd: process.cwd() })

assert.match(prompt, /PROJECT_MEMORY\.md 割付関連節/)
assert.match(prompt, /### 6\.8 /)
assert.match(prompt, /### 6\.48 /)
assert.match(prompt, /===SNAP===/)
assert.ok(!prompt.includes('## 1. プロジェクト概要'), 'MEMORY 冒頭の全文は載せない')
assert.ok(!prompt.includes('### 6.21 '), '無関係UI節は載せない')

console.log('buildProposePrompt.test.ts: ok')
