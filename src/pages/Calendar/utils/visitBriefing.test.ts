import assert from 'node:assert/strict'
import {
  formatBriefingText,
  formatConstraintLine,
  formatPreferredHopeParts,
  formatPreferredTimeRange,
  formatPreferredWeekdays,
  formatPreviousVisitLabel,
} from './visitBriefing.ts'

assert.equal(formatBriefingText(' 大阪市 ', '住所未登録'), '大阪市')
assert.equal(formatBriefingText('  ', '住所未登録'), '住所未登録')
assert.equal(formatBriefingText(null, '電話未登録'), '電話未登録')
assert.equal(formatPreferredWeekdays([1, 3]), '月・水')
assert.equal(formatPreferredWeekdays([]), '希望曜日の登録なし')
assert.equal(formatPreferredTimeRange('10:00:00', '11:30:00'), '10:00〜11:30')
assert.equal(formatPreferredTimeRange(null, null), null)
assert.equal(
  formatConstraintLine({
    constraint_type: 'ng',
    day_of_week: 2,
    specific_date: null,
    note: '入浴後は不可',
  }),
  'NG / 火曜 / 入浴後は不可',
)
assert.equal(
  formatConstraintLine({
    constraint_type: 'unavailable',
    day_of_week: 1,
    specific_date: null,
    note: null,
    start_time: '09:00:00',
    end_time: '11:00:00',
  }),
  '不可 / 月曜 / 09:00〜11:00',
)
assert.deepEqual(
  formatPreferredHopeParts([1, 3], [], '10:00:00', '11:30:00'),
  { weekdayLabel: '月・水', timeRangeLabel: '10:00〜11:30' },
)
assert.deepEqual(
  formatPreferredHopeParts(
    [1, 3],
    [
      {
        constraint_type: 'available',
        day_of_week: 1,
        specific_date: null,
        note: null,
        start_time: '09:00:00',
        end_time: '11:00:00',
      },
    ],
    '10:00:00',
    '11:30:00',
  ),
  { weekdayLabel: '月 09:00〜11:00・水 10:00〜11:30', timeRangeLabel: null },
)
assert.equal(
  formatPreviousVisitLabel(
    {
      id: 'prev',
      scheduled_date: '2026-08-10',
      start_time: '09:00',
      end_time: '09:30',
      status: 'confirmed',
      staffName: '山田',
      menuText: 'メンテナンス',
    },
    '2026-07-01',
  ),
  '2026/8/10(月) 09:00（30分） 山田 メンテナンス',
)
assert.equal(formatPreviousVisitLabel(null, '2026-07-01'), '2026/7/1（条件の前回日）')
assert.equal(formatPreviousVisitLabel(null, null), '前回の訪問はまだありません')

console.log('visitBriefing.test.ts: ok')
