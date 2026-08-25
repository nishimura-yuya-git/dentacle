import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  defaultConfirmedVisitTimes,
  formatConfirmedVisitLine,
  todayIsoDate,
  toVisitTimeHms,
  validatePatientConfirmedVisitDraft,
} from './patientConfirmedVisit.ts'

describe('patientConfirmedVisit', () => {
  it('今日の日付をローカルの YYYY-MM-DD にする', () => {
    assert.equal(todayIsoDate(new Date(2026, 7, 25, 12, 0, 0)), '2026-08-25')
  })

  it('希望開始と所要から終了を決める。無いときは 09:00 から30分', () => {
    assert.deepEqual(
      defaultConfirmedVisitTimes({ preferredStart: '10:00:00', durationMinutes: 45 }),
      { start: '10:00', end: '10:45' },
    )
    assert.deepEqual(defaultConfirmedVisitTimes({}), { start: '09:00', end: '09:30' })
  })

  it('日付・時刻・号車が揃い、終了が開始より後なら通す', () => {
    const ok = validatePatientConfirmedVisitDraft({
      date: '2026-08-25',
      start: '09:00',
      end: '09:30',
      teamId: 'team-1',
    })
    assert.equal(ok.ok, true)
  })

  it('欠けや逆転は日本語で止める', () => {
    assert.equal(
      validatePatientConfirmedVisitDraft({
        date: '',
        start: '09:00',
        end: '09:30',
        teamId: 'team-1',
      }).ok,
      false,
    )
    const reversed = validatePatientConfirmedVisitDraft({
      date: '2026-08-25',
      start: '10:00',
      end: '09:00',
      teamId: 'team-1',
    })
    assert.equal(reversed.ok, false)
    if (!reversed.ok) assert.match(reversed.message, /終了は開始より後/)
  })

  it('DB用の時刻は HH:mm:ss に揃える', () => {
    assert.equal(toVisitTimeHms('9:00'), '9:00')
    assert.equal(toVisitTimeHms('09:00'), '09:00:00')
    assert.equal(toVisitTimeHms('09:00:00'), '09:00:00')
  })

  it('一覧行は日付・時間・号車を1行にする', () => {
    assert.equal(
      formatConfirmedVisitLine({
        id: 'v1',
        scheduledDate: '2026-08-25',
        startTime: '09:00:00',
        endTime: '09:30:00',
        teamName: '訪問1号車',
      }),
      '2026/08/25 09:00〜09:30 · 訪問1号車',
    )
  })
})
