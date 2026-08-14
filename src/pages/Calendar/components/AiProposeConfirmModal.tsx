import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { formatJapaneseDate } from '@/pages/Calendar/utils/calendarGrid'

type Props = {
  isOpen: boolean
  date: string
  busy: boolean
  canPropose: boolean
  onClose: () => void
  onConfirm: () => void
}

/**
 * カレンダー「AI提案」の確認。生成＋仮予約一括採用の前に一度止める。
 */
export function AiProposeConfirmModal({
  isOpen,
  date,
  busy,
  canPropose,
  onClose,
  onConfirm,
}: Props) {
  return (
    <Modal
      isOpen={isOpen}
      title="AI提案で仮予約を載せる"
      onClose={busy ? () => undefined : onClose}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            キャンセル
          </Button>
          <Button loading={busy} disabled={!canPropose} onClick={onConfirm}>
            この日に仮予約する
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm font-medium leading-relaxed text-slate-700">
          <span className="font-bold text-slate-900">{formatJapaneseDate(date)}</span>
          の訪問スケジュール案を生成し、仮予約としてカレンダーに登録します。
        </p>
        <ul className="list-disc space-y-2 pl-5 text-xs font-medium leading-relaxed text-slate-500">
          <li>登録される予約は「仮予約」です。電話確認後に本予約へ進めます。</li>
          <li>号車列がある場合は、提案を順に振り分けて表示します。</li>
          <li>点線の仮枠をクリックすると詳細が開きます。内容を確認してから本予約に確定します。</li>
        </ul>
        {!canPropose ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
            提案の実行はオーナー / 管理者 / コーディネーターのみ可能です。
          </p>
        ) : null}
      </div>
    </Modal>
  )
}
