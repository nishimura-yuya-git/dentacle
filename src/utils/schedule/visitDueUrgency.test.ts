import assert from 'node:assert/strict'
import {
  compareDueUrgency,
  computeVisitDueInfo,
} from './visitDueUrgency.ts'

{
  const overdue = computeVisitDueInfo({
    targetDate: '2026-08-11',
    visitFrequency: 'weekly',
    lastVisitDate: '2026-07-01',
    nextDueDate: '2026-08-01',
  })
  assert.equal(overdue.dueStatus, 'overdue')
  assert.ok((overdue.dueUrgencyDays ?? 0) > 0)
}

{
  const fromFreq = computeVisitDueInfo({
    targetDate: '2026-08-11',
    visitFrequency: 'monthly',
    lastVisitDate: '2026-07-11',
    nextDueDate: null,
  })
  assert.equal(fromFreq.nextDueDate, '2026-08-10')
  assert.equal(fromFreq.dueStatus, 'overdue')
  assert.equal(fromFreq.dueUrgencyDays, 1)
}

{
  const soon = computeVisitDueInfo({
    targetDate: '2026-08-11',
    visitFrequency: 'weekly',
    lastVisitDate: null,
    nextDueDate: '2026-08-13',
  })
  assert.equal(soon.dueStatus, 'due_soon')
}

{
  const a = computeVisitDueInfo({
    targetDate: '2026-08-11',
    visitFrequency: 'unknown',
    lastVisitDate: null,
    nextDueDate: null,
  })
  const b = computeVisitDueInfo({
    targetDate: '2026-08-11',
    visitFrequency: 'weekly',
    lastVisitDate: '2026-08-01',
    nextDueDate: null,
  })
  assert.ok(compareDueUrgency(b, a) < 0)
}

console.log('visitDueUrgency.test.ts: ok')
