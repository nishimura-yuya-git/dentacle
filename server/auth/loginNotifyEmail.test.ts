import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  DEFAULT_LOGIN_NOTIFY_TO,
  buildLoginNotifyEmail,
  formatLoginNotifyDateTime,
  resolveLoginNotifyTo,
} from './loginNotifyEmail.ts'

describe('formatLoginNotifyDateTime', () => {
  it('UTC を日本時間に直す', () => {
    // 2026-09-14 06:34:16 UTC = 15:34:16 JST
    assert.equal(
      formatLoginNotifyDateTime('2026-09-14T06:34:16.449Z'),
      '2026/09/14 15:34:16',
    )
  })

  it('不正な日時はダッシュ', () => {
    assert.equal(formatLoginNotifyDateTime('not-a-date'), '—')
  })
})

describe('resolveLoginNotifyTo', () => {
  it('未設定なら西村さんのメールに送る', () => {
    assert.equal(resolveLoginNotifyTo({}), DEFAULT_LOGIN_NOTIFY_TO)
    assert.equal(DEFAULT_LOGIN_NOTIFY_TO, 'y.nishimura@leanstack.co.jp')
  })

  it('環境変数があれば上書きする', () => {
    assert.equal(
      resolveLoginNotifyTo({ LOGIN_NOTIFY_TO: ' ops@example.com ' }),
      'ops@example.com',
    )
  })
})

describe('buildLoginNotifyEmail', () => {
  it('件名と本文にログイン者と監査項目を入れる', () => {
    const mail = buildLoginNotifyEmail({
      displayName: '吹上',
      email: 'y.fukiage@leanstack.co.jp',
      createdAt: '2026-09-14T06:34:16.449Z',
      ip: '203.0.113.10',
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      metadata: {
        memberships: [{ clinic_id: 'c1', clinic_name: 'テスト院', role: 'call' }],
      },
    })

    assert.equal(mail.subject, '【Dentacle】ログイン: 吹上')
    assert.match(mail.text, /ログインがありました/)
    assert.match(mail.text, /日時: 2026\/09\/14 15:34:16（日本時間）/)
    assert.match(mail.text, /メール: y\.fukiage@leanstack\.co\.jp/)
    assert.match(mail.text, /表示名: 吹上/)
    assert.match(mail.text, /IP: 203\.0\.113\.10/)
    assert.match(mail.text, /端末: パソコン · Mac · Chrome/)
    assert.match(mail.text, /所属: テスト院/)
  })

  it('表示名が空なら件名にメールを使う', () => {
    const mail = buildLoginNotifyEmail({
      displayName: '  ',
      email: 'staff@example.com',
      createdAt: '2026-09-14T06:34:16.449Z',
      ip: null,
      userAgent: null,
      metadata: {},
    })
    assert.equal(mail.subject, '【Dentacle】ログイン: staff@example.com')
    assert.match(mail.text, /表示名: —/)
    assert.match(mail.text, /IP: —/)
    assert.match(mail.text, /所属: 所属なし/)
  })
})
