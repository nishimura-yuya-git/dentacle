import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  formatImprovementDate,
  formatImprovementEmptyCopy,
  formatImprovementPageLabel,
  PROGRESS_TABLE_COLUMNS,
} from './formatImprovementItem.ts'

describe('formatImprovementItem', () => {
  it('日付は年月日で、月日をゼロ埋めしない', () => {
    assert.equal(formatImprovementDate('2026-08-14T12:00:00.000Z'), '2026年8月14日')
    assert.equal(formatImprovementDate(''), '—')
    assert.equal(formatImprovementDate('not-a-date'), '—')
  })

  it('既知の画面パスだけ日本語にする', () => {
    assert.equal(formatImprovementPageLabel('/calendar'), 'カレンダー')
    assert.equal(formatImprovementPageLabel('/patients'), '患者管理')
    assert.equal(formatImprovementPageLabel('/admins'), '運営')
    assert.equal(formatImprovementPageLabel('/unknown'), null)
    assert.equal(formatImprovementPageLabel(null), null)
  })

  it('空状態は次の行動を日本語で返す', () => {
    assert.equal(
      formatImprovementEmptyCopy(),
      '共有中の改善はまだありません。右下のご意見から送ると、ここに行ができます。',
    )
  })

  it('表の列名は日本語だけにする', () => {
    assert.deepEqual(PROGRESS_TABLE_COLUMNS, ['日付', '状態', '内容', '画面', 'クリニック', '操作'])
  })
})
