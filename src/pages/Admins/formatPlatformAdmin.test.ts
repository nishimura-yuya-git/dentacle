import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  formatPlatformAdminEmptyCopy,
  formatPlatformAdminEditCopy,
  formatPlatformAdminGrantCopy,
  formatPlatformAdminName,
  formatPlatformAdminNote,
  formatPlatformAdminRevokeCopy,
  PLATFORM_ADMIN_TABLE_COLUMNS,
} from './formatPlatformAdmin.ts'

describe('formatPlatformAdmin', () => {
  it('表示名がなければメールを使う', () => {
    assert.equal(
      formatPlatformAdminName({ displayName: '山田', email: 'a@example.com' }),
      '山田',
    )
    assert.equal(
      formatPlatformAdminName({ displayName: null, email: 'a@example.com' }),
      'a@example.com',
    )
  })

  it('空状態と列名は日本語にする', () => {
    assert.match(formatPlatformAdminEmptyCopy(), /右上から/)
    assert.deepEqual(PLATFORM_ADMIN_TABLE_COLUMNS, ['名前', 'メール', 'メモ', '追加日', '操作'])
    assert.equal(formatPlatformAdminGrantCopy().title, '運営を追加')
    assert.match(formatPlatformAdminGrantCopy().description, /招待を送ります/)
    assert.equal(formatPlatformAdminGrantCopy().submitLabel, '招待メールを送る')
    assert.equal(formatPlatformAdminEditCopy().title, '運営を編集')
    assert.equal(formatPlatformAdminRevokeCopy().title, '運営を削除')
  })

  it('メモが空ならダッシュにする', () => {
    assert.equal(formatPlatformAdminNote('協業先'), '協業先')
    assert.equal(formatPlatformAdminNote('  '), '—')
    assert.equal(formatPlatformAdminNote(null), '—')
  })
})
