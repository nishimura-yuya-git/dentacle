import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  ensurePreferredDrafts,
  isExceptionConstraintRow,
  isManagedAllDayUnavailable,
  isManagedWeekdayTimeRow,
  isValidTimeRange,
  leftoverAllDayUnavailableIds,
  applyAllDayUnavailable,
  persistableWindows,
  planWeekdayTimeSaves,
  validateWeekdayWindows,
  windowsFromConstraintRows,
  withAllDayUnavailable,
  type ConstraintTimeRow,
  type WeekdayTimeWindow,
} from './weekdayUnavailable.ts'

function windowOf(
  partial: Partial<WeekdayTimeWindow> & Pick<WeekdayTimeWindow, 'dayOfWeek' | 'kind'>,
): WeekdayTimeWindow {
  return {
    id: null,
    clientId: partial.clientId ?? `c-${partial.dayOfWeek}-${partial.kind}`,
    start: '',
    end: '',
    ...partial,
  }
}

describe('isValidTimeRange', () => {
  it('終了が開始より後だけ通す', () => {
    assert.equal(isValidTimeRange('09:00', '11:00'), true)
    assert.equal(isValidTimeRange('09:00:00', '09:30:00'), true)
    assert.equal(isValidTimeRange('11:00', '09:00'), false)
    assert.equal(isValidTimeRange('09:00', '09:00'), false)
    assert.equal(isValidTimeRange('', '11:00'), false)
  })
})

describe('windowsFromConstraintRows', () => {
  it('曜日＋時刻付きと終日いけないを取り込み、NG・特定日・時刻なし可は残す', () => {
    const rows: ConstraintTimeRow[] = [
      {
        id: 'avail-mon',
        constraint_type: 'available',
        day_of_week: 1,
        specific_date: null,
        start_time: '09:00:00',
        end_time: '11:00:00',
      },
      {
        id: 'unavail-mon',
        constraint_type: 'unavailable',
        day_of_week: 1,
        specific_date: null,
        start_time: '14:00:00',
        end_time: '16:00:00',
      },
      {
        id: 'weekday-only',
        constraint_type: 'unavailable',
        day_of_week: 2,
        specific_date: null,
        start_time: null,
        end_time: null,
      },
      {
        id: 'weekday-only-extra',
        constraint_type: 'unavailable',
        day_of_week: 2,
        specific_date: null,
        start_time: null,
        end_time: null,
      },
      {
        id: 'untimed-available',
        constraint_type: 'available',
        day_of_week: 4,
        specific_date: null,
        start_time: null,
        end_time: null,
      },
      {
        id: 'ng-row',
        constraint_type: 'ng',
        day_of_week: 3,
        specific_date: null,
        start_time: '10:00:00',
        end_time: '12:00:00',
      },
      {
        id: 'date-row',
        constraint_type: 'unavailable',
        day_of_week: null,
        specific_date: '2026-08-25',
        start_time: '09:00:00',
        end_time: '10:00:00',
      },
    ]

    const windows = windowsFromConstraintRows(rows)
    assert.deepEqual(
      windows.map((row) => ({
        id: row.id,
        kind: row.kind,
        dayOfWeek: row.dayOfWeek,
        start: row.start,
        end: row.end,
        allDay: row.allDay === true,
      })),
      [
        { id: 'avail-mon', kind: 'preferred', dayOfWeek: 1, start: '09:00', end: '11:00', allDay: false },
        { id: 'unavail-mon', kind: 'unavailable', dayOfWeek: 1, start: '14:00', end: '16:00', allDay: false },
        { id: 'weekday-only', kind: 'unavailable', dayOfWeek: 2, start: '', end: '', allDay: true },
      ],
    )
    assert.equal(isManagedWeekdayTimeRow(rows[2]), false)
    assert.equal(isManagedAllDayUnavailable(rows[2]), true)
    assert.equal(isExceptionConstraintRow(rows[2]), false)
    assert.equal(isExceptionConstraintRow(rows[4]), false)
    assert.equal(isExceptionConstraintRow(rows[5]), true)
    assert.equal(isExceptionConstraintRow(rows[6]), true)
    assert.deepEqual(leftoverAllDayUnavailableIds(rows, windows), ['weekday-only-extra'])
  })
})

describe('ensurePreferredDrafts', () => {
  it('終日いけない曜日には希望時間の空行を足さない', () => {
    const existing = [
      windowOf({
        id: 'all-day',
        clientId: 'all-day',
        dayOfWeek: 2,
        kind: 'unavailable',
        allDay: true,
      }),
    ]
    const next = ensurePreferredDrafts(existing, [2])
    assert.equal(next.filter((row) => row.kind === 'preferred').length, 0)
  })

  it('選択曜日に希望時間の空行を足し、既存は消さない', () => {
    const existing = [
      windowOf({
        id: 'keep',
        clientId: 'keep',
        dayOfWeek: 3,
        kind: 'unavailable',
        start: '09:00',
        end: '10:00',
      }),
    ]
    const next = ensurePreferredDrafts(existing, [1, 3])
    assert.equal(next.some((row) => row.id === 'keep'), true)
    assert.equal(next.filter((row) => row.dayOfWeek === 1 && row.kind === 'preferred').length, 1)
    assert.equal(next.filter((row) => row.dayOfWeek === 3 && row.kind === 'preferred').length, 1)
    const again = ensurePreferredDrafts(next, [1, 3])
    assert.equal(again.filter((row) => row.kind === 'preferred').length, 2)
  })
})

describe('validateWeekdayWindows / persistableWindows', () => {
  it('空行は無視し、片方だけ・逆転は落とす', () => {
    const empty = windowOf({ dayOfWeek: 1, kind: 'preferred' })
    const valid = windowOf({ dayOfWeek: 1, kind: 'unavailable', start: '09:00', end: '11:00' })
    assert.deepEqual(validateWeekdayWindows([empty, valid]), { ok: true })
    assert.equal(persistableWindows([empty, valid]).length, 1)

    const half = validateWeekdayWindows([
      windowOf({ dayOfWeek: 1, kind: 'preferred', start: '09:00', end: '' }),
    ])
    assert.equal(half.ok, false)
    if (!half.ok) assert.match(half.message, /月曜の希望時間/)

    const reversed = validateWeekdayWindows([
      windowOf({ dayOfWeek: 3, kind: 'unavailable', start: '11:00', end: '09:00' }),
    ])
    assert.equal(reversed.ok, false)
    if (!reversed.ok) assert.match(reversed.message, /水曜のいけない時間/)
  })
})

describe('planWeekdayTimeSaves', () => {
  it('追加・更新・削除を分け、空行は保存しない', () => {
    const existing: WeekdayTimeWindow[] = [
      windowOf({
        id: 'keep',
        clientId: 'keep',
        dayOfWeek: 1,
        kind: 'preferred',
        start: '09:00',
        end: '11:00',
      }),
      windowOf({
        id: 'drop',
        clientId: 'drop',
        dayOfWeek: 1,
        kind: 'unavailable',
        start: '14:00',
        end: '16:00',
      }),
    ]
    const draft: WeekdayTimeWindow[] = [
      windowOf({
        id: 'keep',
        clientId: 'keep',
        dayOfWeek: 1,
        kind: 'preferred',
        start: '10:00',
        end: '12:00',
      }),
      windowOf({ clientId: 'new', dayOfWeek: 3, kind: 'unavailable', start: '09:00', end: '10:00' }),
      windowOf({ clientId: 'empty', dayOfWeek: 5, kind: 'preferred' }),
    ]
    const plan = planWeekdayTimeSaves(existing, draft)
    assert.deepEqual(plan.deleteIds, ['drop'])
    assert.equal(plan.insert.length, 1)
    assert.equal(plan.insert[0]?.dayOfWeek, 3)
    assert.equal(plan.update.length, 1)
    assert.equal(plan.update[0]?.id, 'keep')
    assert.equal(plan.update[0]?.start, '10:00')
  })

  it('選択解除相当でも draft に残れば削除しない', () => {
    const existing = [
      windowOf({
        id: 'mon',
        clientId: 'mon',
        dayOfWeek: 1,
        kind: 'preferred',
        start: '09:00',
        end: '11:00',
      }),
    ]
    const plan = planWeekdayTimeSaves(existing, existing)
    assert.deepEqual(plan.deleteIds, [])
    assert.deepEqual(plan.insert, [])
    assert.deepEqual(plan.update, [])
  })

  it('終日いけないを追加し、同じ曜日の時刻付きは保存しない', () => {
    const existing = [
      windowOf({
        id: 'timed',
        clientId: 'timed',
        dayOfWeek: 2,
        kind: 'unavailable',
        start: '09:00',
        end: '10:00',
      }),
    ]
    const draft = [
      ...existing,
      windowOf({ clientId: 'all-day', dayOfWeek: 2, kind: 'unavailable', allDay: true }),
    ]
    const plan = planWeekdayTimeSaves(existing, draft)
    assert.deepEqual(plan.deleteIds, ['timed'])
    assert.equal(plan.insert.length, 1)
    assert.equal(plan.insert[0]?.allDay, true)
    assert.equal(plan.update.length, 0)
  })

  it('終日いけないを外すと時刻なし行を消す', () => {
    const existing = [
      windowOf({
        id: 'all-day',
        clientId: 'all-day',
        dayOfWeek: 3,
        kind: 'unavailable',
        allDay: true,
      }),
    ]
    const plan = planWeekdayTimeSaves(existing, [])
    assert.deepEqual(plan.deleteIds, ['all-day'])
  })
})

describe('applyAllDayUnavailable', () => {
  it('終日いけないを付けても希望曜日はトグルせず外すだけ', () => {
    const timed = windowOf({
      id: 'keep',
      clientId: 'keep',
      dayOfWeek: 1,
      kind: 'unavailable',
      start: '14:00',
      end: '16:00',
    })
    const on = applyAllDayUnavailable([timed], [1, 3], 1, true)
    assert.deepEqual(on.weekdays, [3])
    assert.equal(on.windows.some((row) => row.id === 'keep'), true)
    assert.equal(on.windows.filter((row) => row.allDay && row.dayOfWeek === 1).length, 1)
    const again = applyAllDayUnavailable(on.windows, on.weekdays, 1, true)
    assert.deepEqual(again.weekdays, [3])
    assert.equal(again.windows.filter((row) => row.allDay && row.dayOfWeek === 1).length, 1)
    const off = applyAllDayUnavailable(on.windows, on.weekdays, 1, false)
    assert.deepEqual(off.weekdays, [3])
    assert.equal(off.windows.some((row) => row.allDay), false)
  })
})

describe('withAllDayUnavailable', () => {
  it('終日いけないの付け外しで既存の時間帯は残す', () => {
    const timed = windowOf({
      id: 'keep',
      clientId: 'keep',
      dayOfWeek: 1,
      kind: 'unavailable',
      start: '14:00',
      end: '16:00',
    })
    const on = withAllDayUnavailable([timed], 1, true)
    assert.equal(on.some((row) => row.id === 'keep'), true)
    assert.equal(on.filter((row) => row.allDay).length, 1)
    const off = withAllDayUnavailable(on, 1, false)
    assert.deepEqual(
      off.map((row) => row.id),
      ['keep'],
    )
  })
})
