import { Button } from '@/components/ui/Button'

type Props = {
  open: boolean
  busy: boolean
  onClose: () => void
  onConfirm: () => void
}

/** 予約キャンセルの確認。window.confirm は使わない */
export function VisitCancelConfirm({ open, busy, onClose, onConfirm }: Props) {
  if (!open) return null
  return (
    <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-4">
      <p className="text-sm font-bold text-rose-800">この予約をキャンセルしますか？</p>
      <p className="mt-1 text-xs font-medium text-rose-700">
        キャンセルリストに残ります。この操作は元に戻せません。
      </p>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="secondary" disabled={busy} onClick={onClose}>
          やめる
        </Button>
        <Button
          variant="soft"
          className="!bg-rose-600 !text-white hover:!bg-rose-700"
          loading={busy}
          onClick={onConfirm}
        >
          キャンセルする
        </Button>
      </div>
    </div>
  )
}
