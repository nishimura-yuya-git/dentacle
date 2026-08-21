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
  'src/pages/Login/MfaStoreLinks.tsx',
  'src/pages/Login/mfaEnrollCopy.ts',
  'src/pages/Login/startPlatformAdminTotpEnroll.ts',
  'src/pages/Login/LoginErrorText.tsx',
  'src/pages/Login/LoginSignOutButton.tsx',
  'src/pages/Login/AuthCardBrand.tsx',
  'src/pages/Login/SetPasswordPage.tsx',
  'src/pages/Login/OtpCodeInput.tsx',
  'src/features/auth/AuthProvider.tsx',
  'src/features/auth/authErrors.ts',
  'src/features/auth/recordAuthAudit.ts',
  'src/features/auth/signOutSession.ts',
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
    assert.match(source, /startPlatformAdminTotpEnroll/)
    assert.match(source, /MFA_AUTHENTICATOR_ICON_SRC/)
    assert.match(source, /MfaStoreLinks/)
    assert.match(readSrc('src/pages/Login/MfaStoreLinks.tsx'), /link\.iconSrc/)
  })

  it('ログイン系エラーは塗り箱にせず赤テキストにする', () => {
    const files = [
      'src/pages/Login/LoginPage.tsx',
      'src/pages/Login/MfaEnrollPanel.tsx',
      'src/pages/Login/MfaChallengePanel.tsx',
      'src/pages/Login/SetPasswordPage.tsx',
      'src/pages/Login/LoginErrorText.tsx',
    ]
    for (const relativePath of files) {
      const source = readSrc(relativePath)
      assert.doesNotMatch(source, /bg-rose-50/, relativePath)
      assert.match(source, /LoginErrorText|role="alert"/, relativePath)
    }
    assert.match(readSrc('src/pages/Login/LoginErrorText.tsx'), /text-rose-600/)
    assert.doesNotMatch(readSrc('src/pages/Login/LoginErrorText.tsx'), /rounded-xl/)
  })

  it('認証アプリ登録は案内が収まる幅にし、パスワード欄は狭いままにする', () => {
    const source = readSrc('src/pages/Login/LoginPage.tsx')
    assert.match(source, /max-w-\[640px\]/)
    assert.match(source, /max-w-\[440px\]/)
    assert.match(source, /useWideLoginCard/)
    assert.match(source, /min-h-dvh/)
  })

  it('確認コードの6マスは正方形で、カード幅に合わせて横に伸ばさない', () => {
    const source = readSrc('src/pages/Login/OtpCodeInput.tsx')
    assert.match(source, /size-12/)
    assert.match(source, /sm:size-14/)
    assert.doesNotMatch(source, /flex-1/)
    assert.doesNotMatch(source, /justify-between/)
  })

  it('認証アプリ登録は確認コードと登録ボタンの間を空けない', () => {
    const enroll = readSrc('src/pages/Login/MfaEnrollPanel.tsx')
    assert.match(enroll, /flex flex-col gap-4/)
    assert.doesNotMatch(enroll, /mt-auto/)
    assert.doesNotMatch(enroll, /space-y-8/)
  })

  it('セッションがある待ち表示と登録準備中でもログアウトできる', () => {
    const login = readSrc('src/pages/Login/LoginPage.tsx')
    assert.match(
      login,
      /セキュリティ確認をしています…[\s\S]{0,250}LoginSignOutButton/,
    )
    const enroll = readSrc('src/pages/Login/MfaEnrollPanel.tsx')
    assert.match(
      enroll,
      /認証アプリの登録を準備しています…[\s\S]{0,250}LoginSignOutButton/,
    )
    const signOut = readSrc('src/features/auth/AuthProvider.tsx')
    assert.match(signOut, /void recordAuthAuditEvent\('logout'\)/)
    assert.match(signOut, /signOutSession/)
    assert.match(signOut, /setUser\(null\)/)
  })

  it('認証カードはカード内先頭・左側に公式ロゴを置き、パネルへ重複しない', () => {
    const login = readSrc('src/pages/Login/LoginPage.tsx')
    const setPassword = readSrc('src/pages/Login/SetPasswordPage.tsx')
    assert.match(login, /AuthCardBrand/)
    assert.match(setPassword, /AuthCardBrand/)
    assert.doesNotMatch(readSrc('src/pages/Login/MfaEnrollPanel.tsx'), /AuthCardBrand|BrandLogo/)
    assert.doesNotMatch(readSrc('src/pages/Login/MfaChallengePanel.tsx'), /AuthCardBrand|BrandLogo/)
    const brand = readSrc('src/pages/Login/AuthCardBrand.tsx')
    assert.match(brand, /size="auth"/)
    assert.match(brand, /justify-start/)
    assert.doesNotMatch(brand, /デンタクル/)
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
