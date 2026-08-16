import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '../../..')

function readSrc(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), 'utf8')
}

const LOGIN_AUTH_SOURCES = [
  'src/pages/Login/LoginPage.tsx',
  'src/pages/Login/MfaChallengePanel.tsx',
  'src/pages/Login/MfaEnrollPanel.tsx',
  'src/pages/Login/SetPasswordPage.tsx',
  'src/pages/Login/OtpCodeInput.tsx',
  'src/features/auth/AuthProvider.tsx',
  'src/features/auth/authErrors.ts',
  'src/features/auth/recordAuthAudit.ts',
  'src/features/auth/MfaGateRoute.tsx',
  'src/components/common/ProtectedRoute.tsx',
] as const

const FORBIDDEN_SOURCE_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /dangerouslySetInnerHTML/, label: 'dangerouslySetInnerHTML' },
  { pattern: /\.innerHTML\s*=/, label: 'innerHTML 代入' },
  { pattern: /\beval\s*\(/, label: 'eval' },
  { pattern: /\bnew\s+Function\s*\(/, label: 'new Function' },
  { pattern: /document\.write\s*\(/, label: 'document.write' },
  { pattern: /service_role/, label: 'service_role' },
  {
    pattern: /(?:SELECT|INSERT|UPDATE|DELETE|DROP|UNION)\s+[\s\S]{0,80}(?:\$\{|\+\s*email|\+\s*password)/i,
    label: 'SQL 文字列結合',
  },
]

describe('ログイン／認証ソースの危険 API', () => {
  it('HTML 埋め込み・eval・SQL 結合・service_role を置かない', () => {
    for (const relativePath of LOGIN_AUTH_SOURCES) {
      const source = readSrc(relativePath)
      for (const { pattern, label } of FORBIDDEN_SOURCE_PATTERNS) {
        assert.equal(pattern.test(source), false, `${relativePath}: ${label}`)
      }
    }
  })
})

describe('ログイン入力の送り先', () => {
  it('パスワードは signInWithPassword に JSON で渡し、生エラーは固定文へ変換する', () => {
    const source = readSrc('src/features/auth/AuthProvider.tsx')
    assert.match(source, /signInWithPassword/)
    assert.match(source, /toLoginErrorMessage/)
    assert.match(source, /email:\s*email\.trim\(\)/)
    assert.doesNotMatch(source, /error\.message\s*[,}]/)
  })

  it('ログイン監査はイベントと clinic だけ送り、判定 RPC に IP を渡さない', () => {
    const source = readSrc('src/features/auth/recordAuthAudit.ts')
    const auditCall = source.match(
      /supabase\.rpc\('log_auth_audit_event',\s*\{[\s\S]*?\}\)/,
    )?.[0]
    const blockCheck = source.match(/supabase\.rpc\('is_request_ip_blocked'[^)]*\)/)?.[0]
    assert.ok(auditCall)
    assert.ok(blockCheck)
    assert.match(auditCall, /p_event:/)
    assert.match(auditCall, /p_clinic_id:/)
    assert.doesNotMatch(auditCall, /p_ip/)
    assert.doesNotMatch(blockCheck, /p_ip/)
    assert.doesNotMatch(source, /p_client_ip/)
  })

  it('成功後の遷移先は /calendar 固定で、クエリをリダイレクトに使わない', () => {
    const source = readSrc('src/pages/Login/LoginPage.tsx')
    assert.match(source, /navigate\('\/calendar',\s*\{\s*replace:\s*true\s*\}\)/)
    assert.match(source, /searchParams\.get\('registered'\) === '1'/)
    assert.doesNotMatch(source, /searchParams\.get\(['"]redirect/)
    assert.doesNotMatch(source, /searchParams\.get\(['"]next/)
    assert.doesNotMatch(source, /window\.location\s*=/)
  })

  it('MFA 登録 QR は許可スキームだけ img にする', () => {
    const source = readSrc('src/pages/Login/MfaEnrollPanel.tsx')
    assert.match(source, /isSafeMfaQrSrc/)
  })
})

describe('ルートの認証境界', () => {
  it('業務画面は ProtectedRoute と MFA ゲートの内側、監査は運営専用', () => {
    const app = readSrc('src/App.tsx')
    const login = app.indexOf('path="/login"')
    const setPassword = app.indexOf('path="/set-password"')
    const protectedRoute = app.indexOf('<Route element={<ProtectedRoute />}>')
    const mfaGate = app.indexOf('<Route element={<MfaGateRoute />}>')
    const calendar = app.indexOf('path="/calendar"')
    const adminRoute = app.indexOf('<Route element={<PlatformAdminRoute />}>')
    const authAudit = app.indexOf('path="/auth-audit"')

    assert.ok(login > 0 && login < protectedRoute)
    assert.ok(setPassword > 0 && setPassword < protectedRoute)
    assert.ok(protectedRoute > 0 && mfaGate > protectedRoute)
    assert.ok(calendar > mfaGate)
    assert.ok(adminRoute > mfaGate && authAudit > adminRoute)
  })
})
