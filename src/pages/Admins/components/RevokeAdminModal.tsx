import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import {
  formatPlatformAdminName,
  formatPlatformAdminRevokeCopy,
} from '@/pages/Admins/formatPlatformAdmin'
import type { PlatformAdminView } from '@/pages/Admins/platformAdminTypes'

export function RevokeAdminModal({
  target,
  busy,
  onClose,
  onConfirm,
}: {
  target: PlatformAdminView | null
  busy: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  const copy = formatPlatformAdminRevokeCopy()

  return (
    <Modal
      isOpen={target != null}
      title={copy.title}
      onClose={onClose}
      closeDisabled={busy}
      footer={
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>
            キャンセル
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="border-rose-200 text-rose-600 hover:bg-rose-50"
            loading={busy}
            onClick={onConfirm}
          >
            削除する
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-sm leading-relaxed text-slate-600">{copy.confirm}</p>
        {target ? (
          <p className="text-sm font-bold text-slate-800">
            {formatPlatformAdminName(target)}
            {target.email ? `（${target.email}）` : ''}
          </p>
        ) : null}
      </div>
    </Modal>
  )
}
