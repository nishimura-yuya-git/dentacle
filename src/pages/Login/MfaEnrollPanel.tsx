import { useEffect, useState, type FormEvent } from 'react'
import { APP_DISPLAY_NAME } from '@/config/appName'
import { Button } from '@/components/ui/Button'
import { isSafeMfaQrSrc } from '@/features/auth/loginSecurityContract'
import { supabase } from '@/lib/supabase'
import {
  MFA_AUTHENTICATOR_STORE_LINKS,
  MFA_ENROLL_LEAD,
  MFA_ENROLL_STEPS,
  MFA_ENROLL_TITLE,
  isAllowedAuthenticatorStoreHref,
} from '@/pages/Login/mfaEnrollCopy'
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
        friendlyName: `${APP_DISPLAY_NAME}運営`,
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
        <h2 className="text-lg font-bold text-slate-900">{MFA_ENROLL_TITLE}</h2>
        <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">{MFA_ENROLL_LEAD}</p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm font-medium leading-relaxed text-slate-500">
          {MFA_ENROLL_STEPS.map((step, index) => (
            <li key={step}>
              {step}
              {index === 0 ? (
                <span className="mt-1 block text-xs font-medium text-slate-400">
                  {MFA_AUTHENTICATOR_STORE_LINKS.filter((link) =>
                    isAllowedAuthenticatorStoreHref(link.href),
                  ).map((link, linkIndex) => (
                    <span key={link.href}>
                      {linkIndex > 0 ? ' ／ ' : null}
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-[#008C01] underline decoration-dotted underline-offset-4"
                      >
                        {link.label}
                      </a>
                    </span>
                  ))}
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </div>

      {qrCode && isSafeMfaQrSrc(qrCode) ? (
        <div className="flex justify-center rounded-2xl border border-slate-100 bg-slate-50 p-6">
          <img src={qrCode} alt="認証アプリ登録用QRコード" className="h-44 w-44" />
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
