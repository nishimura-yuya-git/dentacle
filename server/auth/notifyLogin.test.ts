import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  notifyLoginSuccess,
  resetLoginNotifyIdempotencyForTests,
  type LoginAuditRow,
  type NotifyLoginSuccessDeps,
} from './notifyLogin.ts'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')

const AUDIT_ID = 'd2936e54-958d-4155-a014-ad4167f9107b'

function auditRow(overrides: Partial<LoginAuditRow> = {}): LoginAuditRow {
  return {
    id: AUDIT_ID,
    userId: 'user-1',
    event: 'login_success',
    ip: '203.0.113.10',
    userAgent: 'Mozilla/5.0 (Macintosh) Chrome/120.0.0.0',
    createdAt: '2026-09-14T06:34:16.449Z',
    metadata: { memberships: [] },
    email: 'y.fukiage@leanstack.co.jp',
    displayName: '吹上',
    ...overrides,
  }
}

function deps(overrides: Partial<NotifyLoginSuccessDeps> = {}): NotifyLoginSuccessDeps {
  return {
    getUser: async () => ({ id: 'user-1', email: 'y.fukiage@leanstack.co.jp' }),
    loadAudit: async () => auditRow(),
    sendEmail: async () => ({ ok: true }),
    ...overrides,
  }
}

const env = {
  LOGIN_NOTIFY_FROM: 'Dentacle <noreply@example.com>',
  RESEND_API_KEY: 're_test_key',
}

describe('notifyLoginSuccess', () => {
  it('ログイン成功なら運営メールを1通送る', async () => {
    resetLoginNotifyIdempotencyForTests()
    const sent: Array<{ to: string; subject: string; idempotencyKey: string }> = []
    const result = await notifyLoginSuccess(
      { accessToken: 'token', auditId: AUDIT_ID },
      deps({
        sendEmail: async (input) => {
          sent.push({
            to: input.to,
            subject: input.subject,
            idempotencyKey: input.idempotencyKey,
          })
          return { ok: true }
        },
      }),
      env,
    )
    assert.deepEqual(result, { ok: true, sent: true })
    assert.equal(sent.length, 1)
    assert.equal(sent[0]?.to, 'y.nishimura@leanstack.co.jp')
    assert.equal(sent[0]?.subject, '【Dentacle】ログイン: 吹上')
    assert.equal(sent[0]?.idempotencyKey, `login-notify-${AUDIT_ID}`)
  })

  it('同じ監査IDでは再送しない', async () => {
    resetLoginNotifyIdempotencyForTests()
    let sendCount = 0
    const first = await notifyLoginSuccess(
      { accessToken: 'token', auditId: AUDIT_ID },
      deps({
        sendEmail: async () => {
          sendCount += 1
          return { ok: true }
        },
      }),
      env,
    )
    const second = await notifyLoginSuccess(
      { accessToken: 'token', auditId: AUDIT_ID },
      deps({
        sendEmail: async () => {
          sendCount += 1
          return { ok: true }
        },
      }),
      env,
    )
    assert.deepEqual(first, { ok: true, sent: true })
    assert.deepEqual(second, { ok: true, sent: false })
    assert.equal(sendCount, 1)
  })

  it('ログアウト監査では送らない', async () => {
    resetLoginNotifyIdempotencyForTests()
    let sent = false
    const result = await notifyLoginSuccess(
      { accessToken: 'token', auditId: AUDIT_ID },
      deps({
        loadAudit: async () => auditRow({ event: 'logout' }),
        sendEmail: async () => {
          sent = true
          return { ok: true }
        },
      }),
      env,
    )
    assert.deepEqual(result, { ok: true, sent: false })
    assert.equal(sent, false)
  })

  it('他人の監査は拒否する', async () => {
    resetLoginNotifyIdempotencyForTests()
    const result = await notifyLoginSuccess(
      { accessToken: 'token', auditId: AUDIT_ID },
      deps({
        loadAudit: async () => auditRow({ userId: 'other-user' }),
      }),
      env,
    )
    assert.equal(result.ok, false)
    if (result.ok) return
    assert.equal(result.code, 'forbidden')
  })

  it('未ログインは拒否する', async () => {
    resetLoginNotifyIdempotencyForTests()
    const result = await notifyLoginSuccess(
      { accessToken: 'token', auditId: AUDIT_ID },
      deps({ getUser: async () => null }),
      env,
    )
    assert.equal(result.ok, false)
    if (result.ok) return
    assert.equal(result.code, 'unauthorized')
  })

  it('送信元未設定なら not_configured', async () => {
    resetLoginNotifyIdempotencyForTests()
    let sent = false
    const result = await notifyLoginSuccess(
      { accessToken: 'token', auditId: AUDIT_ID },
      deps({
        sendEmail: async () => {
          sent = true
          return { ok: true }
        },
      }),
      {},
    )
    assert.equal(result.ok, false)
    if (result.ok) return
    assert.equal(result.code, 'not_configured')
    assert.equal(sent, false)
  })

  it('Resend 未設定なら not_configured', async () => {
    resetLoginNotifyIdempotencyForTests()
    const result = await notifyLoginSuccess(
      { accessToken: 'token', auditId: AUDIT_ID },
      deps({
        sendEmail: async () => ({ ok: false, message: 'not_configured' }),
      }),
      env,
    )
    assert.equal(result.ok, false)
    if (result.ok) return
    assert.equal(result.code, 'not_configured')
  })

  it('フロントは login_success のあとだけ通知し、IP は送らない', () => {
    const source = readFileSync(
      join(repoRoot, 'src/features/auth/recordAuthAudit.ts'),
      'utf8',
    )
    assert.match(source, /\/api\/auth\/login-notify/)
    assert.match(source, /event === 'login_success'/)
    assert.match(source, /void requestLoginNotify/)
    assert.match(source, /JSON\.stringify\(\{ auditId \}\)/)
    assert.doesNotMatch(source, /p_client_ip/)
    assert.doesNotMatch(source, /RESEND_API_KEY/)
    assert.doesNotMatch(source, /service_role/)
  })

  it('ローカル Vite は同じ API パスを受ける', () => {
    const source = readFileSync(
      join(repoRoot, 'scripts/vite-schedule-propose-middleware.mjs'),
      'utf8',
    )
    assert.match(source, /\/api\/auth\/login-notify/)
    assert.match(source, /notifyLoginSuccess/)
  })
})
