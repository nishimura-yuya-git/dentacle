import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
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
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-slate-900">追加の確認</h2>
        <p className="mt-2 text-sm font-medium text-slate-500">
          認証アプリに表示されている6桁のコードを入力してください。
        </p>
      </div>

      <OtpCodeInput id="mfa-code" value={code} onChange={setCode} disabled={submitting} />

      {errorMessage ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700"
        >
          {errorMessage}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 pt-1">
        <Button type="submit" size="lg" className="!h-14 w-full !rounded-xl" loading={submitting}>
          確認して入る
        </Button>
        <Button
          type="button"
          variant="outline"
          className="!h-12 w-full !rounded-xl"
          onClick={onCancel}
          disabled={submitting}
        >
          ログアウト
        </Button>
      </div>
    </form>
  )
}
