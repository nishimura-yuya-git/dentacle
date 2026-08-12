import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { OtpCodeInput } from '@/pages/Login/OtpCodeInput'
import { normalizeOtpDigits } from '@/pages/Login/otpCodeUtils'

type Props = {
  onVerified: () => void
  onCancel: () => void
}

export function MfaEnrollPanel({ onVerified, onCancel }: Props) {
  const [factorId, setFactorId] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function startEnroll() {
      setLoading(true)
      setErrorMessage(null)
      // 中断した未検証 factor が残っていると enroll が失敗しやすいので掃除
      const { data: existing } = await supabase.auth.mfa.listFactors()
      const unverified = (existing?.all ?? []).filter((factor) => factor.status === 'unverified')
      for (const factor of unverified) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id })
      }
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'デンタクル運営',
      })
      if (cancelled) return
      if (error || !data) {
        setErrorMessage('認証アプリの登録を開始できませんでした。')
        setLoading(false)
        return
      }
      setFactorId(data.id)
      setQrCode(data.totp.qr_code)
      setSecret(data.totp.secret)
      setLoading(false)
    }

    void startEnroll()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!factorId) return
    setErrorMessage(null)
    const trimmed = normalizeOtpDigits(code, 6)
    if (!/^\d{6}$/.test(trimmed)) {
      setErrorMessage('認証アプリの6桁コードを入力してください。')
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: trimmed,
      })
      if (error) {
        setErrorMessage('コードが正しくありません。もう一度入力してください。')
        return
      }
      onVerified()
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <p className="text-sm font-medium text-slate-500">認証アプリの登録を準備しています…</p>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-slate-900">認証アプリを登録</h2>
        <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
          運営アカウントは追加確認が必要です。Google Authenticator などのアプリで QR
          コードを読み取り、表示された6桁コードで完了してください。
        </p>
      </div>

      {qrCode ? (
        <div className="flex justify-center rounded-2xl border border-slate-100 bg-slate-50 p-6">
          <img src={qrCode} alt="認証アプリ登録用QRコード" className="h-44 w-44" />
        </div>
      ) : null}

      {secret ? (
        <p className="break-all text-center text-xs font-medium text-slate-400">
          手動入力用キー: {secret}
        </p>
      ) : null}

      <OtpCodeInput
        id="mfa-enroll-code"
        value={code}
        onChange={setCode}
        disabled={submitting}
      />

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
          登録して入る
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
