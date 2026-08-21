import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { LoginErrorText } from '@/pages/Login/LoginErrorText'
import { LoginSignOutButton } from '@/pages/Login/LoginSignOutButton'
import { OtpCodeInput } from '@/pages/Login/OtpCodeInput'
import { normalizeOtpDigits } from '@/pages/Login/otpCodeUtils'

type Props = {
  factorId: string
  onVerified: () => void
  onCancel: () => void
}

export function MfaChallengePanel({ factorId, onVerified, onCancel }: Props) {
  const [code, setCode] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setErrorMessage(null)
    const trimmed = normalizeOtpDigits(code, 6)
    if (!/^\d{6}$/.test(trimmed)) {
      setErrorMessage('認証アプリの6桁コードを入力してください。')
      return
    }

    setSubmitting(true)
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      })
      if (challengeError || !challenge) {
        setErrorMessage('認証の準備に失敗しました。もう一度お試しください。')
        return
      }
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: trimmed,
      })
      if (verifyError) {
        setErrorMessage('コードが正しくありません。もう一度入力してください。')
        return
      }
      onVerified()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900">追加の確認</h2>
        <p className="mt-1 text-sm font-medium text-slate-500">
          認証アプリに表示されている6桁のコードを入力してください。
        </p>
      </div>

      <div className="space-y-3">
        <OtpCodeInput id="mfa-code" value={code} onChange={setCode} disabled={submitting} />
        {errorMessage ? <LoginErrorText>{errorMessage}</LoginErrorText> : null}
      </div>

      <div className="flex flex-col gap-1">
        <Button type="submit" size="lg" className="!h-12 w-full !rounded-xl" loading={submitting}>
          確認して入る
        </Button>
        <LoginSignOutButton onSignOut={onCancel} />
      </div>
    </form>
  )
}
