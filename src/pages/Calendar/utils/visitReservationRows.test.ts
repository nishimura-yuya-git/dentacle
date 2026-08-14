import assert from 'node:assert/strict'
import {
  canCancelReservation,
  durationMinutesLabel,
  ensureCurrentReservation,
  formatReservationDateTime,
  pickPreviousReservation,
  reservationMenuText,
  staffNameFromJoin,
} from './visitReservationRows.ts'

assert.equal(durationMinutesLabel('09:00', '09:30'), '30分')
assert.equal(
  formatReservationDateTime('2026-08-17', '09:00', '09:30'),
  '2026/8/17(月) 09:00（30分）',
)
assert.equal(
  reservationMenuText([
    {
      slot: '1',
      code: 'maintenance',
      name_snapshot: 'メンテナンス',
      duration_minutes_snapshot: 30,
    },
    {
      slot: '2',
      code: 'first-visit',
      name_snapshot: '初診',
      duration_minutes_snapshot: 40,
    },
  ]),
  'メンテナンス / 初診',
)
assert.equal(reservationMenuText([]), '指定なし')
assert.equal(canCancelReservation('confirmed'), true)
assert.equal(canCancelReservation('tentative'), true)
assert.equal(canCancelReservation('cancelled'), false)
assert.equal(canCancelReservation('completed'), false)
assert.equal(staffNameFromJoin({ display_name: '山田院長' }), '山田院長')
assert.equal(staffNameFromJoin([{ display_name: '山田院長' }]), '山田院長')

const current = {
  id: 'now',
  scheduled_date: '2026-08-17',
  start_time: '09:00',
  end_time: '09:30',
  status: 'confirmed',
  staffName: '山田院長',
  menuText: '指定なし',
}
assert.equal(ensureCurrentReservation([], current)[0]?.id, 'now')
assert.equal(ensureCurrentReservation([current], current).length, 1)

const older = { ...current, id: 'old', scheduled_date: '2026-08-03', staffName: '佐藤' }
const cancelled = { ...current, id: 'gone', scheduled_date: '2026-08-10', status: 'cancelled' }
const later = { ...current, id: 'next', scheduled_date: '2026-08-24' }
assert.equal(pickPreviousReservation([later, cancelled, older, current], current)?.id, 'old')
assert.equal(pickPreviousReservation([current], current), null)

console.log('visitReservationRows.test.ts: ok')
