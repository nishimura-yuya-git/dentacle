import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useToast } from '@/components/ui/Toast'
import { useImprovementItems } from '@/pages/Progress/hooks/useImprovementItems'
import { ProgressList } from '@/pages/Progress/sections/ProgressList'
import { ProgressSummary } from '@/pages/Progress/sections/ProgressSummary'
import { formatImprovementStatusSavedMessage } from '@/pages/Progress/improvementAnnouncement'
import type { ImprovementStatus } from '@/pages/Progress/improvementItemPolicy'

export function ProgressPage() {
  const toast = useToast()
  const { items, loading, error, busyId, setStatus } = useImprovementItems()

  async function handleStatusChange(id: string, status: ImprovementStatus) {
    const result = await setStatus(id, status)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    toast.success(formatImprovementStatusSavedMessage(status))
  }

  return (
    <DashboardLayout
      title="改善の進捗"
      description="ご意見の対応状況。運営だけが見られます。反映済みにすると、お知らせに入ります。"
      actions={<ProgressSummary items={items} />}
    >
      <div className="w-full">
        <section>
          <h2 className="mb-6 text-xl font-bold text-slate-900">一覧</h2>
          {loading ? (
            <p className="text-sm font-medium text-slate-500">進捗を読み込んでいます…</p>
          ) : error ? (
            <p className="text-sm font-medium text-rose-600">{error}</p>
          ) : (
            <ProgressList
              items={items}
              busyId={busyId}
              onStatusChange={(id, status) => void handleStatusChange(id, status)}
            />
          )}
        </section>
      </div>
    </DashboardLayout>
  )
}
