import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  formatAuthAuditDeviceLabel,
  formatAuthAuditEventLabel,
  formatAuthAuditUserAgent,
} from './formatAuthAudit.ts'

describe('formatAuthAuditEventLabel', () => {
  it('既知イベントを日本語にする', () => {
    assert.equal(formatAuthAuditEventLabel('login_success'), 'ログイン成功')
    assert.equal(formatAuthAuditEventLabel('logout'), 'ログアウト')
  })
})

describe('formatAuthAuditUserAgent', () => {
  it('空はダッシュ', () => {
    assert.equal(formatAuthAuditUserAgent(null), '—')
  })

  it('長いUAは省略する', () => {
    const long = 'a'.repeat(100)
    const formatted = formatAuthAuditUserAgent(long)
    assert.ok(formatted.endsWith('…'))
    assert.ok(formatted.length < long.length)
  })
})

describe('formatAuthAuditDeviceLabel', () => {
  it('Mac + Chrome を日本語ラベルにする', () => {
    const ua =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    assert.equal(formatAuthAuditDeviceLabel(ua), 'パソコン · Mac · Chrome')
  })

  it('iPhone + Safari を判定する', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    assert.equal(formatAuthAuditDeviceLabel(ua), 'スマホ · iPhone · Safari')
  })
})
