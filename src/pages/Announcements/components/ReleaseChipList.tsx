import type { RefObject } from 'react'
import { ReleaseChip } from '@/pages/Announcements/components/ReleaseChip'
import { formatProductUpdateKindLabel } from '@/pages/Announcements/formatProductUpdate'
import type { ProductUpdateView } from '@/pages/Announcements/productUpdateTypes'
import { formatReleaseChipBadge } from '@/pages/Announcements/releaseChipDisplay'

export function ReleaseChipList({
  items,
  selectedId,
  selectedAnchorRef,
  onSelect,
}: {
  items: ProductUpdateView[]
  selectedId: string | null
  selectedAnchorRef: RefObject<HTMLDivElement | null>
  onSelect: (item: ProductUpdateView) => void
}) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-4 pt-3 pr-4">
      {items.map((item) => {
        const badge = formatReleaseChipBadge({
          status: item.status,
          kindLabel: formatProductUpdateKindLabel(item.kind),
          showInProgressBadge: item.showInProgressBadge,
        })
        const selected = item.id === selectedId
        return (
          <div
            key={item.id}
            ref={selected ? selectedAnchorRef : undefined}
            className="inline-flex"
          >
            <ReleaseChip
              label={item.title}
              badge={badge?.label}
              badgePlacement={badge?.placement}
              badgeTone={badge?.tone}
              selected={selected}
              onClick={() => onSelect(item)}
            />
          </div>
        )
      })}
    </div>
  )
}
