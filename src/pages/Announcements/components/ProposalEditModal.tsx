import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { ProposalItemActions } from '@/pages/Announcements/components/ProposalItemActions'
import { formatProductUpdateDate } from '@/pages/Announcements/formatProductUpdate'
import type { ProductUpdateView } from '@/pages/Announcements/productUpdateTypes'

const PANEL_WIDTH = 400

/** リリース予定の開発中編集。連絡者リストと同じ近傍パネル。 */
export function ProposalEditModal({
  item,
  anchorRef,
  locked,
  onClose,
  onToggleInProgressBadge,
  onSaveTitle,
  onDelete,
}: {
  item: ProductUpdateView | null
  anchorRef: RefObject<HTMLElement | null>
  locked: boolean
  onClose: () => void
  onToggleInProgressBadge: (show: boolean) => void
  onSaveTitle: (title: string) => void
  onDelete: () => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const open = item != null

  useLayoutEffect(() => {
    if (!open) return
    const update = () => {
      const rect = anchorRef.current?.getBoundingClientRect()
      if (!rect) return
      const width = Math.min(PANEL_WIDTH, window.innerWidth - 16)
      let left = rect.left
      if (left + width > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - width - 8)
      }
      setPos({
        top: Math.min(rect.bottom + 6, window.innerHeight - 24),
        left,
      })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [anchorRef, item?.id, open])

  useEffect(() => {
    if (!open || locked) return
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node
      if (anchorRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      onClose()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [anchorRef, locked, onClose, open])

  if (!open || !item) return null

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="リリース予定"
      style={{ top: pos.top, left: pos.left }}
      className="fixed z-[60] flex w-[min(25rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl"
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div>
          <p className="text-sm font-bold text-slate-900">リリース予定</p>
          <p className="mt-0.5 text-xs font-medium text-slate-500">
            <time dateTime={item.proposedAt}>{formatProductUpdateDate(item.proposedAt)}</time>
          </p>
        </div>
        <Button
          variant="ghost"
          className="!px-2 !py-1 !text-xs"
          disabled={locked}
          onClick={onClose}
        >
          閉じる
        </Button>
      </div>
      <div className="px-4 py-4">
        <ProposalItemActions
          item={item}
          locked={locked}
          onToggleInProgressBadge={onToggleInProgressBadge}
          onSaveTitle={onSaveTitle}
          onDelete={onDelete}
        />
      </div>
    </div>,
    document.body,
  )
}
