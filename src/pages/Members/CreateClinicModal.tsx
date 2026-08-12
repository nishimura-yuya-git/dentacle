import type { FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

type Props = {
  open: boolean
  busy: boolean
  clinicName: string
  clinicCode: string
  onClose: () => void
  onClinicNameChange: (value: string) => void
  onClinicCodeChange: (value: string) => void
  onSubmit: (event: FormEvent) => void
}

export function CreateClinicModal({
  open,
  busy,
  clinicName,
  clinicCode,
  onClose,
  onClinicNameChange,
  onClinicCodeChange,
  onSubmit,
}: Props) {
  return (
    <Modal
      isOpen={open}
      title="クリニックを作成"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            キャンセル
          </Button>
          <Button type="submit" form="create-clinic-form" loading={busy}>
            作成してオーナーになる
          </Button>
        </div>
      }
    >
      <form id="create-clinic-form" onSubmit={onSubmit} className="space-y-4">
        <Input
          label="クリニック名"
          value={clinicName}
          onChange={(e) => onClinicNameChange(e.target.value)}
          required
        />
        <Input
          label="コード（任意）"
          value={clinicCode}
          onChange={(e) => onClinicCodeChange(e.target.value)}
        />
      </form>
    </Modal>
  )
}
