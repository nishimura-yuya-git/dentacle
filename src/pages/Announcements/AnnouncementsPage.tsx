import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useProductUpdates } from '@/pages/Announcements/hooks/useProductUpdates'
import type { ProductUpdateKind, ProductUpdateSurface } from '@/pages/Announcements/productUpdatePolicy'
import { ProposalQueueSection } from '@/pages/Announcements/sections/ProposalQueueSection'
import { ProposeUpdateModal } from '@/pages/Announcements/sections/ProposeUpdateModal'
import { PublishedTimeline } from '@/pages/Announcements/sections/PublishedTimeline'

/**
 * お知らせの正本画面。院ユーザーには公開済みだけ見せる。
 * 運営は提案→入れる／入れない。実装やデプロイでは自動公開しない。
 */
export function AnnouncementsPage() {
  const toast = useToast()
  const { published, proposed, loading, error, busyId, isPlatformAdmin, propose, publish, reject } =
    useProductUpdates()
  const [proposeOpen, setProposeOpen] = useState(false)
  const [proposing, setProposing] = useState(false)

  async function handlePropose(draft: {
    kind: ProductUpdateKind
    title: string
    body: string
    detailUrl: string
    surfaces: ProductUpdateSurface[]
  }) {
    setProposing(true)
    const result = await propose(draft)
    setProposing(false)
    if (!result.ok) {
      toast.error(result.message)
      return false
    }
    toast.success('提案しました。入れるまでお知らせには出ません。')
    return true
  }

  async function handlePublish(id: string) {
    const result = await publish(id)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    toast.success('お知らせに入れました。')
  }

  async function handleReject(id: string) {
    const result = await reject(id)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    toast.success('入れないにしました。お知らせには出ません。')
  }

  return (
    <DashboardLayout
      title="お知らせ"
      description="公開された更新内容"
      actions={
        isPlatformAdmin ? (
          <Button variant="primary" onClick={() => setProposeOpen(true)}>
            更新を提案する
          </Button>
        ) : null
      }
    >
      <div className="mx-auto w-full max-w-3xl space-y-10">
        {isPlatformAdmin ? (
          <p className="text-sm font-medium leading-relaxed text-slate-500">
            機能を直した・デプロイしただけでは、この画面には出ません。提案したあと「入れる」としたものだけ院ユーザーに見えます。
          </p>
        ) : null}

        {isPlatformAdmin ? (
          <ProposalQueueSection
            items={proposed}
            busyId={busyId}
            onPublish={(id) => void handlePublish(id)}
            onReject={(id) => void handleReject(id)}
          />
        ) : null}

        <section>
          <h2 className="mb-6 text-xl font-bold text-slate-900">更新情報</h2>
          {loading ? (
            <p className="text-sm font-medium text-slate-500">お知らせを読み込んでいます…</p>
          ) : error ? (
            <p className="text-sm font-medium text-rose-600">{error}</p>
          ) : (
            <PublishedTimeline items={published} />
          )}
        </section>
      </div>

      {isPlatformAdmin ? (
        <ProposeUpdateModal
          open={proposeOpen}
          submitting={proposing}
          onClose={() => setProposeOpen(false)}
          onSubmit={handlePropose}
        />
      ) : null}
    </DashboardLayout>
  )
}
