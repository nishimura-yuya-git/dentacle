import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { needsPasswordSetup } from '@/pages/Login/needsPasswordSetup'

/** 運営で MFA 未完了ならログイン画面へ戻す */
export function MfaGateRoute() {
  const { user, loading, mfaGate, mfaGateLoading } = useAuth()

  if (loading || mfaGateLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F0F9F0]">
        <p className="text-sm font-medium text-slate-500">セキュリティ確認をしています…</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (needsPasswordSetup(user)) {
    return <Navigate to="/set-password" replace />
  }

  if (mfaGate.status !== 'ok') {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
