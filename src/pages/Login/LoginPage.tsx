import { useState, type FormEvent, type ReactNode } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/useAuth'
import {
  assertAuthIpAllowed,
  recordAuthAuditEvent,
} from '@/features/auth/recordAuthAudit'
import { MfaChallengePanel } from '@/pages/Login/MfaChallengePanel'
import { MfaEnrollPanel } from '@/pages/Login/MfaEnrollPanel'
import { EyeIcon, EyeOffIcon } from '@/pages/Login/LoginIcons'
import { needsPasswordSetup } from '@/pages/Login/needsPasswordSetup'

/**
 * 真っ白背景 / 白カード / 全幅主ボタン。
 * 色・フォントはデンタクル（緑 / Zen Maru Gothic）。
 * カード外のブランド枠（デ＋サービス名）は置かない。
 * 運営は TOTP（登録 or 確認）を経てから入る。
 */
export function LoginPage() {
  const { user, loading, signIn, signOut, mfaGate, mfaGateLoading, refreshMfaGate } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const registered = searchParams.get('registered') === '1'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function finishMfaAndEnter() {
    const ipGate = await assertAuthIpAllowed()
    if (!ipGate.allowed) {
      setErrorMessage(ipGate.errorMessage)
      await signOut()
      return
    }
    await refreshMfaGate()
    await recordAuthAuditEvent('login_success')
    navigate('/calendar', { replace: true })
  }

  if (!loading && needsPasswordSetup(user)) {
    return <Navigate to="/set-password" replace />
  }

  // セッション確定かつ MFA 不要 → カレンダーへ。ゲート再評価中はパスワード画面を出さない
  if (!loading && !mfaGateLoading && user && mfaGate.status === 'ok') {
    return <Navigate to="/calendar" replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)

    if (!email.trim() || !password) {
      setErrorMessage('メールアドレスとパスワードを入力してください。')
      return
    }

    setSubmitting(true)
    try {
      const { errorMessage: nextError } = await signIn(email, password)
      if (nextError) {
        setErrorMessage(nextError)
        return
      }
      // MFA が必要なら同画面でパネル表示。不要なら上の Navigate がカレンダーへ送る
    } finally {
      setSubmitting(false)
    }
  }

  let cardBody: ReactNode
  if (user && mfaGate.status === 'challenge') {
    cardBody = (
      <MfaChallengePanel
        factorId={mfaGate.factorId}
        onVerified={() => {
          void finishMfaAndEnter()
        }}
        onCancel={() => {
          void signOut()
        }}
      />
    )
  } else if (user && mfaGate.status === 'enroll') {
    cardBody = (
      <MfaEnrollPanel
        onVerified={() => {
          void finishMfaAndEnter()
        }}
        onCancel={() => {
          void signOut()
        }}
      />
    )
  } else if (user) {
    // ログイン済みでゲート解決中／遷移中。メール・パスワード画面へ戻さない
    cardBody = (
      <p className="text-sm font-medium text-slate-500">セキュリティ確認をしています…</p>
    )
  } else {
    cardBody = (
      <form onSubmit={handleSubmit}>
        <h1 className="mb-10 flex items-center gap-3 text-left text-xl font-bold text-slate-900">
          <span className="h-6 w-1.5 shrink-0 rounded-full bg-[#008C01]" aria-hidden="true" />
          ログイン
        </h1>

        <div className="space-y-8">
          <div className="space-y-3">
            <label htmlFor="email" className="block text-sm font-bold text-slate-800">
              メールアドレス
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-900 outline-none transition focus:border-[#008C01] focus:ring-4 focus:ring-[#008C01]/20"
              placeholder="メールアドレスを入力"
            />
          </div>

          <div className="space-y-3">
            <label htmlFor="password" className="block text-sm font-bold text-slate-800">
              パスワード
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-5 py-4 pr-12 text-sm text-slate-900 outline-none transition focus:border-[#008C01] focus:ring-4 focus:ring-[#008C01]/20"
                placeholder="パスワードを入力"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 transition hover:text-slate-700"
                aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {registered && !errorMessage ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-800">
              パスワードを設定しました。メールとパスワードでログインしてください。
            </div>
          ) : null}

          {errorMessage ? (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700"
            >
              {errorMessage}
            </div>
          ) : null}

          <div className="pt-2">
            <Button type="submit" size="lg" className="!h-14 w-full !rounded-xl" loading={submitting}>
              ログイン
            </Button>
          </div>
        </div>

        <p className="mt-10 text-center text-xs font-medium leading-relaxed text-slate-400">
          アカウントの発行は管理者のみが行います。
          <br />
          ログインできない場合は管理者へご連絡ください。
        </p>
      </form>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6 py-16">
      <div className="w-full max-w-[440px]">
        <div className="rounded-[28px] border border-slate-200 bg-white px-10 py-12 shadow-[0_8px_30px_rgba(15,23,42,0.06)] sm:px-12 sm:py-14">
          {cardBody}
        </div>
      </div>
    </div>
  )
}

