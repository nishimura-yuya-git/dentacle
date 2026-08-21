import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { isSafeMfaQrSrc } from '@/features/auth/loginSecurityContract'
import { useAuth } from '@/features/auth/useAuth'
import { supabase } from '@/lib/supabase'
import {
  MFA_AUTHENTICATOR_ICON_SRC,
  MFA_ENROLL_LEAD,
  MFA_ENROLL_STEPS,
  MFA_ENROLL_TITLE,
} from '@/pages/Login/mfaEnrollCopy'
import { LoginErrorText } from '@/pages/Login/LoginErrorText'
import { LoginSignOutButton } from '@/pages/Login/LoginSignOutButton'
import { MfaStoreLinks } from '@/pages/Login/MfaStoreLinks'
import { OtpCodeInput } from '@/pages/Login/OtpCodeInput'
import { normalizeOtpDigits } from '@/pages/Login/otpCodeUtils'
import { startPlatformAdminTotpEnroll } from '@/pages/Login/startPlatformAdminTotpEnroll'

type Props = {
  onVerified: () => void
  onCancel: () => void
}

export function MfaEnrollPanel({ onVerified, onCancel }: Props) {
  const { user } = useAuth()
  const [factorId, setFactorId] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false

    setLoading(true)
    setErrorMessage(null)
    void startPlatformAdminTotpEnroll(user.id, supabase).then((result) => {
      if (cancelled) return
      if (!result.ok) {
        setErrorMessage('認証アプリの登録を開始できませんでした。')
        setLoading(false)
        return
      }
      setFactorId(result.factorId)
      setQrCode(result.qrCode)
      setSecret(result.secret)
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [user?.id])

  async function verifyCode(rawCode: string) {
    if (!factorId || submittingRef.current) return
    setErrorMessage(null)
    const trimmed = normalizeOtpDigits(rawCode, 6)
    if (!/^\d{6}$/.test(trimmed)) {
      setErrorMessage('認証アプリの6桁コードを入力してください。')
      return
    }

    submittingRef.current = true
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
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    void verifyCode(code)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <p className="text-sm font-medium text-slate-500">認証アプリの登録を準備しています…</p>
        <LoginSignOutButton onSignOut={onCancel} />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <div className="flex items-center gap-3">
          <img
            src={MFA_AUTHENTICATOR_ICON_SRC}
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-[10px] object-cover"
            draggable={false}
          />
          <h2 className="text-lg font-bold text-slate-900">{MFA_ENROLL_TITLE}</h2>
        </div>
        <p className="mt-1 text-sm font-medium leading-relaxed text-slate-500">{MFA_ENROLL_LEAD}</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm font-medium leading-relaxed text-slate-500">
          {MFA_ENROLL_STEPS.map((step, index) => (
            <li key={step}>
              {step}
              {index === 0 ? <MfaStoreLinks /> : null}
            </li>
          ))}
        </ol>
      </div>

      {qrCode && isSafeMfaQrSrc(qrCode) ? (
        <div className="flex justify-center rounded-2xl border border-slate-100 bg-slate-50 p-3">
          <img src={qrCode} alt="認証アプリ登録用QRコード" className="h-32 w-32" />
        </div>
      ) : qrCode ? (
        <p className="text-sm font-medium text-slate-500">
          QRコードを表示できません。下の手動入力用キーを使ってください。
        </p>
      ) : null}

      {secret ? (
        <p className="break-all text-center text-xs font-medium text-slate-400">
          手動入力用キー: {secret}
        </p>
      ) : null}

      <div className="space-y-3">
        <OtpCodeInput
          id="mfa-enroll-code"
          value={code}
          onChange={setCode}
          onComplete={(nextCode) => {
            void verifyCode(nextCode)
          }}
          disabled={submitting}
        />
        {errorMessage ? <LoginErrorText>{errorMessage}</LoginErrorText> : null}
      </div>

      <div className="flex flex-col gap-1">
        <Button type="submit" size="lg" className="!h-12 w-full !rounded-xl" loading={submitting}>
          登録して入る
        </Button>
        <LoginSignOutButton onSignOut={onCancel} />
      </div>
    </form>
  )
}
