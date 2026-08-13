import { Button } from '@/components/ui/Button'
import { UpdateTimelineItem } from '@/pages/Announcements/components/UpdateTimelineItem'
import { canReviewProductUpdate } from '@/pages/Announcements/productUpdatePolicy'
import type { ProductUpdateView } from '@/pages/Announcements/productUpdateTypes'

export function ProposalQueueSection({
  items,
  busyId,
  onPublish,
  onReject,
}: {
  items: ProductUpdateView[]
  busyId: string | null
  onPublish: (id: string) => void
  onReject: (id: string) => void
}) {
  return (
    <section className="rounded-[28px] border border-amber-100 bg-amber-50/60 p-6">
      <h2 className="text-sm font-bold text-slate-900">入れるか判定する</h2>
      <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
        提案しただけではお知らせに出ません。入れる／入れないを選んでください。
      </p>
      {items.length === 0 ? (
        <p className="mt-4 text-sm font-medium text-slate-500">未判定の提案はありません。</p>
      ) : (
        <div className="mt-5">
          {items.map((item, index) => (
            <UpdateTimelineItem
              key={item.id}
              item={item}
              dateValue={item.proposedAt}
              showDashedLine={index < items.length - 1}
              footer={
                canReviewProductUpdate(item.status) ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="primary"
                      disabled={busyId != null}
                      loading={busyId === item.id}
                      onClick={() => onPublish(item.id)}
                    >
                      入れる
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={busyId != null}
                      onClick={() => onReject(item.id)}
                    >
                      入れない
                    </Button>
                  </div>
                ) : null
              }
            />
          ))}
        </div>
      )}
    </section>
  )
}
