import { DashboardLayout } from '@/components/layout/DashboardLayout'

type Props = {
  title: string
  description: string
}

/** 契約・支払いなど、後続実装用の画面枠 */
export function AccountStubPage({ title, description }: Props) {
  return (
    <DashboardLayout title={title} description={description}>
      <section className="max-w-xl rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-sm font-medium leading-relaxed text-slate-600">
          この画面は準備中です。メニューからの導線のみ先に用意しています。
        </p>
      </section>
    </DashboardLayout>
  )
}

export function PaymentHistoryPage() {
  return <AccountStubPage title="お支払い履歴" description="支払い履歴の確認" />
}
