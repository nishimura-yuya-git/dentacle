import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useAuth } from '@/features/auth/useAuth'
import { useClinic } from '@/features/clinic/useClinic'

export function MyPage() {
  const { user } = useAuth()
  const { clinic, clinicReady } = useClinic()

  return (
    <DashboardLayout title="マイページ" description="アカウント情報">
      <section className="max-w-xl rounded-xl border border-slate-200 bg-white p-6">
        <dl className="space-y-4 text-sm">
          <div>
            <dt className="font-bold text-slate-400">メールアドレス</dt>
            <dd className="mt-1 font-medium text-slate-800">{user?.email ?? '—'}</dd>
          </div>
          <div>
            <dt className="font-bold text-slate-400">所属クリニック</dt>
            <dd className="mt-1 font-medium text-slate-800">
              {!clinicReady ? '—' : (clinic?.name ?? '未所属')}
            </dd>
          </div>
        </dl>
      </section>
    </DashboardLayout>
  )
}
