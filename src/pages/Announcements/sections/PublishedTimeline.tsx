import { UpdateTimelineItem } from '@/pages/Announcements/components/UpdateTimelineItem'
import type { ProductUpdateView } from '@/pages/Announcements/productUpdateTypes'

export function PublishedTimeline({ items }: { items: ProductUpdateView[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm font-medium leading-relaxed text-slate-500">
        公開中のお知らせはまだありません。
      </p>
    )
  }

  return (
    <div>
      {items.map((item, index) => (
        <UpdateTimelineItem
          key={item.id}
          item={item}
          dateValue={item.publishedAt ?? item.proposedAt}
          showDashedLine={index < items.length - 1}
        />
      ))}
    </div>
  )
}
