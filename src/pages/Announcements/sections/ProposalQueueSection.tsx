import { useEffect, useRef, useState } from 'react'
import { ProposalEditModal } from '@/pages/Announcements/components/ProposalEditModal'
import { ReleaseChipList } from '@/pages/Announcements/components/ReleaseChipList'
import { ReleaseChipPanel } from '@/pages/Announcements/components/ReleaseChipPanel'
import type { ProductUpdateView } from '@/pages/Announcements/productUpdateTypes'
import {
  formatReleaseChipEmptyCopy,
  formatReleaseSectionTitle,
  releaseSectionMarkSrc,
} from '@/pages/Announcements/releaseChipDisplay'

export function ProposalQueueSection({
  items,
  busyId,
  onToggleInProgressBadge,
  onSaveTitle,
  onDelete,
}: {
  items: ProductUpdateView[]
  busyId: string | null
  onToggleInProgressBadge: (id: string, show: boolean) => void
  onSaveTitle: (id: string, title: string) => void
  onDelete: (id: string) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const selectedAnchorRef = useRef<HTMLDivElement>(null)
  const editing = items.find((item) => item.id === editingId) ?? null

  useEffect(() => {
    if (editingId != null && editing == null) {
      setEditingId(null)
    }
  }, [editing, editingId])

  return (
    <ReleaseChipPanel
      title={formatReleaseSectionTitle('upcoming')}
      markSrc={releaseSectionMarkSrc('upcoming')}
    >
      {items.length === 0 ? (
        <p className="text-sm font-medium text-slate-500">{formatReleaseChipEmptyCopy('upcoming')}</p>
      ) : (
        <ReleaseChipList
          items={items}
          selectedId={editingId}
          selectedAnchorRef={selectedAnchorRef}
          onSelect={(item) => {
            setEditingId((current) => (current === item.id ? null : item.id))
          }}
        />
      )}
      <ProposalEditModal
        item={editing}
        anchorRef={selectedAnchorRef}
        locked={busyId != null}
        onClose={() => setEditingId(null)}
        onToggleInProgressBadge={(show) => {
          if (editing) onToggleInProgressBadge(editing.id, show)
        }}
        onSaveTitle={(title) => {
          if (editing) onSaveTitle(editing.id, title)
        }}
        onDelete={() => {
          if (!editing) return
          onDelete(editing.id)
        }}
      />
    </ReleaseChipPanel>
  )
}
