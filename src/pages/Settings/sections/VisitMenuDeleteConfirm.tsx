import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import type { ClinicVisitMenu } from '@/utils/visitMenus/clinicVisitMenus'

type Props = {
  target: ClinicVisitMenu | null
  busy: boolean
  onClose: () => void
  onConfirm: () => void
}

/** メニュー削除の確認。window.confirm は使わない */
export function VisitMenuDeleteConfirm({ target, busy, onClose, onConfirm }: Props) {
  return (
    <Modal
      isOpen={target != null}
      title="メニューを削除"
      onClose={onClose}
      closeDisabled={busy}
      footer={
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>
            やめる
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
        <p className="text-sm leading-relaxed text-slate-600">
          予約の選択肢から外れます。過去の訪問に書いた名称は残ります
        </p>
        {target ? (
          <p className="text-sm font-bold text-slate-800">
            {target.name}（{target.durationMinutes}分）
          </p>
        ) : null}
      </div>
    </Modal>
  )
}
