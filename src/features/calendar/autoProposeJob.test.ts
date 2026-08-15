import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  AUTO_PROPOSE_NOTE,
  AUTO_PROPOSE_STATUS_DONE,
  AUTO_PROPOSE_STATUS_FAILED,
  AUTO_PROPOSE_STATUS_RUNNING,
  autoProposeStatusLabel,
  formatAutoProposeErrorToast,
  formatAutoProposeSuccessToast,
  isAutoProposeRunning,
  shouldReloadCalendarAfterPropose,
  shouldShowCalendarProposeOverlay,
} from './autoProposeJob.ts'

const here = dirname(fileURLToPath(import.meta.url))

describe('autoProposeJob', () => {
  it('右上は提案中と完了を出し、待機中は出さない', () => {
    assert.equal(autoProposeStatusLabel('running'), AUTO_PROPOSE_STATUS_RUNNING)
    assert.equal(autoProposeStatusLabel('success'), AUTO_PROPOSE_STATUS_DONE)
    assert.equal(autoProposeStatusLabel('error'), AUTO_PROPOSE_STATUS_FAILED)
    assert.equal(autoProposeStatusLabel('idle'), null)
    assert.equal(AUTO_PROPOSE_STATUS_RUNNING, 'ルート最適化提案中')
    assert.equal(AUTO_PROPOSE_STATUS_DONE, 'ルート最適化提案が完了しました')
    assert.equal(isAutoProposeRunning('running'), true)
    assert.equal(isAutoProposeRunning('success'), false)
  })

  it('カレンダーのオーバーレイは実行中かつ同じ院・同じ日だけ', () => {
    assert.equal(
      shouldShowCalendarProposeOverlay({
        phase: 'running',
        jobClinicId: 'c1',
        viewingClinicId: 'c1',
        jobTargetDate: '2026-08-16',
        viewingDate: '2026-08-16',
      }),
      true,
    )
    assert.equal(
      shouldShowCalendarProposeOverlay({
        phase: 'running',
        jobClinicId: 'c1',
        viewingClinicId: 'c2',
        jobTargetDate: '2026-08-16',
        viewingDate: '2026-08-16',
      }),
      false,
    )
    assert.equal(
      shouldShowCalendarProposeOverlay({
        phase: 'running',
        jobClinicId: 'c1',
        viewingClinicId: 'c1',
        jobTargetDate: '2026-08-16',
        viewingDate: '2026-08-17',
      }),
      false,
    )
    assert.equal(
      shouldShowCalendarProposeOverlay({
        phase: 'success',
        jobClinicId: 'c1',
        viewingClinicId: 'c1',
        jobTargetDate: '2026-08-16',
        viewingDate: '2026-08-16',
      }),
      false,
    )
  })

  it('完了後の再読込は同じ院・同じ日だけ', () => {
    assert.equal(
      shouldReloadCalendarAfterPropose({
        resultClinicId: 'c1',
        resultTargetDate: '2026-08-16',
        viewingClinicId: 'c1',
        viewingDate: '2026-08-16',
      }),
      true,
    )
    assert.equal(
      shouldReloadCalendarAfterPropose({
        resultClinicId: 'c1',
        resultTargetDate: '2026-08-16',
        viewingClinicId: 'c1',
        viewingDate: '2026-08-17',
      }),
      false,
    )
  })

  it('完了・失敗トーストと注釈は既存文言を維持する', () => {
    assert.equal(
      formatAutoProposeSuccessToast({ adoptedCount: 3, generatedCount: 5 }),
      '仮予約を3件登録しました（提案5件）',
    )
    assert.match(
      formatAutoProposeErrorToast('割付対象が0件です'),
      /空きを埋める/,
    )
    assert.equal(formatAutoProposeErrorToast('通信に失敗しました'), '通信に失敗しました')
    assert.match(AUTO_PROPOSE_NOTE, /^※ /)
    assert.match(AUTO_PROPOSE_NOTE, /他の画面に移っても/)
  })

  it('実行は ClinicShell より上に置き、カレンダーのローカル起動に戻さない', () => {
    const app = readFileSync(join(here, '../../App.tsx'), 'utf8')
    const calendar = readFileSync(join(here, '../../pages/Calendar/CalendarPage.tsx'), 'utf8')
    const layout = readFileSync(join(here, '../../components/layout/DashboardLayout.tsx'), 'utf8')

    assert.match(app, /AutoProposeJobProvider/)
    assert.match(calendar, /useAutoProposeJob/)
    assert.match(calendar, /AUTO_PROPOSE_NOTE/)
    assert.match(calendar, /showProposeOverlay \? <AiComposingOverlay/)
    assert.match(calendar, /data\.load\(\{ silent: true \}\)/)
    assert.equal(calendar.includes('setAiProposeBusy'), false)
    assert.equal(calendar.includes('runCalendarAutoPropose('), false)
    assert.match(layout, /AutoProposeJobStatus/)
  })
})
