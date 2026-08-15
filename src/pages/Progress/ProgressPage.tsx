import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useToast } from '@/components/ui/Toast'
import { useImprovementItems } from '@/pages/Progress/hooks/useImprovementItems'
import { ProgressList } from '@/pages/Progress/sections/ProgressList'
import { ProgressSummary } from '@/pages/Progress/sections/ProgressSummary'
import { formatImprovementStatusSavedMessage } from '@/pages/Progress/improvementAnnouncement'
import type { ImprovementStatus } from '@/pages/Progress/improvementItemPolicy'

/** 操作ログ・患者一覧と同じ白1枚。角丸カードは置かない。 */
const PROGRESS_ARTICLE_CLASS =
  '-mx-3 -my-2 flex min-h-0 flex-1 flex-col overflow-hidden bg-white px-5 py-5 font-normal leading-[1.7] text-[16px] text-slate-900 md:-mx-4 md:-my-3 md:px-8 md:py-6'

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
      fillViewport
      actions={<ProgressSummary items={items} />}
    >
      <article className={PROGRESS_ARTICLE_CLASS}>
        {error ? (
          <p className="text-sm font-medium text-rose-600">{error}</p>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-auto rounded-2xl border border-slate-200 bg-white">
            <ProgressList
              items={items}
              loading={loading}
              busyId={busyId}
              onStatusChange={(id, status) => void handleStatusChange(id, status)}
            />
          </div>
        )}
      </article>
    </DashboardLayout>
  )
}
