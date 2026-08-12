import { Navigate, Outlet } from 'react-router-dom'
import { useClinic } from '@/features/clinic/useClinic'

/** デンタクル運営（platform_admins）専用ルート */
export function PlatformAdminRoute() {
  const { isPlatformAdmin, clinicReady } = useClinic()

  if (!clinicReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F0F9F0]">
        <p className="text-sm font-medium text-slate-500">権限を確認しています…</p>
      </div>
    )
  }

  if (!isPlatformAdmin) {
    return <Navigate to="/calendar" replace />
  }

  return <Outlet />
}
