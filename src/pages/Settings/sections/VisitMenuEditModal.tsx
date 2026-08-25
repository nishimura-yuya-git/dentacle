import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import type { ClinicVisitMenu } from '@/utils/visitMenus/clinicVisitMenus'

type Props = {
  target: ClinicVisitMenu | null
  name: string
  duration: string
  nameError: string
  durationError: string
  busy: boolean
  onClose: () => void
  onChangeName: (value: string) => void
  onChangeDuration: (value: string) => void
  onSubmit: () => void
}

/** メニュー名称と所要の編集 */
export function VisitMenuEditModal({
  target,
  name,
  duration,
  nameError,
  durationError,
  busy,
  onClose,
  onChangeName,
  onChangeDuration,
  onSubmit,
}: Props) {
  return (
    <Modal
      isOpen={target != null}
      title="メニューを編集"
      onClose={onClose}
      closeDisabled={busy}
      footer={
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>
            キャンセル
          </Button>
          <Button type="button" loading={busy} onClick={onSubmit}>
            保存する
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <Input
          label="名称"
          value={name}
          onChange={(event) => onChangeName(event.target.value)}
          error={nameError || undefined}
        />
        <Input
          label="所要（分）"
          inputMode="numeric"
          value={duration}
          onChange={(event) => onChangeDuration(event.target.value)}
          error={durationError || undefined}
        />
      </div>
    </Modal>
  )
}
