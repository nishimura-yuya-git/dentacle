import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/useAuth'
import { supabase } from '@/lib/supabase'
import { EyeIcon, EyeOffIcon } from '@/pages/Login/LoginIcons'
import { validateNewPassword } from '@/pages/Login/setPasswordPolicy'

export function SetPasswordPage() {
  const { user, loading, signOut } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextError = validateNewPassword(password, confirm)
    if (nextError) {
      setErrorMessage(nextError)
      return
    }

    setSubmitting(true)
    setErrorMessage(null)
    try {
      const { error } = await supabase.auth.updateUser({
        password,
        data: { must_set_password: false },
      })
      if (error) {
        setErrorMessage('パスワードを保存できませんでした。もう一度お試しください。')
        return
      }
      await signOut()
      navigate('/login?registered=1', { replace: true })
    } finally {
      setSubmitting(false)
    }
  }

  let cardBody
  if (loading) {
    cardBody = <p className="text-sm font-medium text-slate-500">リンクを確認しています…</p>
  } else if (!user) {
    cardBody = (
      <div className="space-y-6">
        <h1 className="flex items-center gap-3 text-left text-xl font-bold text-slate-900">
          <span className="h-6 w-1.5 shrink-0 rounded-full bg-[#008C01]" aria-hidden="true" />
          パスワード設定
        </h1>
        <p className="text-sm leading-relaxed text-slate-600">
          リンクが無効か、期限が切れています。運営に連絡して、もう一度招待してもらってください。
        </p>
        <Link
          to="/login"
          className="inline-flex text-sm font-bold text-[#008C01] underline-offset-4 hover:underline"
        >
          ログインへ
        </Link>
      </div>
    )
  } else {
    cardBody = (
      <form onSubmit={(event) => void handleSubmit(event)}>
        <h1 className="mb-10 flex items-center gap-3 text-left text-xl font-bold text-slate-900">
          <span className="h-6 w-1.5 shrink-0 rounded-full bg-[#008C01]" aria-hidden="true" />
          パスワード設定
        </h1>
        <p className="mb-8 text-sm leading-relaxed text-slate-600">
          ログインに使うパスワードを決めてください。設定後、ログイン画面へ移ります。
        </p>
        <div className="space-y-8">
          <PasswordInput
            id="new-password"
            label="パスワード"
            autoComplete="new-password"
            value={password}
            show={showPassword}
            onToggle={() => setShowPassword((current) => !current)}
            onChange={setPassword}
          />
          <PasswordInput
            id="confirm-password"
            label="パスワード（確認）"
            autoComplete="new-password"
            value={confirm}
            show={showPassword}
            onToggle={() => setShowPassword((current) => !current)}
            onChange={setConfirm}
          />
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
              登録する
            </Button>
          </div>
        </div>
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

function PasswordInput({
  id,
  label,
  autoComplete,
  value,
  show,
  onToggle,
  onChange,
}: {
  id: string
  label: string
  autoComplete: string
  value: string
  show: boolean
  onToggle: () => void
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-3">
      <label htmlFor={id} className="block text-sm font-bold text-slate-800">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-5 py-4 pr-12 text-sm text-slate-900 outline-none transition focus:border-[#008C01] focus:ring-4 focus:ring-[#008C01]/20"
          placeholder={`${label}を入力`}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 transition hover:text-slate-700"
          aria-label={show ? 'パスワードを隠す' : 'パスワードを表示'}
          aria-pressed={show}
        >
          {show ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </div>
  )
}
