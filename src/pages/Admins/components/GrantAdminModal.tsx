import { type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { formatPlatformAdminGrantCopy } from '@/pages/Admins/formatPlatformAdmin'

export function GrantAdminModal({
  open,
  busy,
  email,
  error,
  onClose,
  onEmailChange,
  onSubmit,
}: {
  open: boolean
  busy: boolean
  email: string
  error: string | null
  onClose: () => void
  onEmailChange: (value: string) => void
  onSubmit: (event: FormEvent) => void
}) {
  const copy = formatPlatformAdminGrantCopy()

  return (
    <Modal
      isOpen={open}
      title={copy.title}
      onClose={onClose}
      closeDisabled={busy}
      footer={
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>
            キャンセル
          </Button>
          <Button type="submit" form="grant-admin-form" loading={busy}>
            {copy.submitLabel}
          </Button>
        </div>
      }
    >
      <form id="grant-admin-form" onSubmit={onSubmit} className="space-y-5">
        <p className="text-sm leading-relaxed text-slate-600">{copy.description}</p>
        <Input
          label="メールアドレス"
          name="admin-email"
          type="email"
          autoComplete="off"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          required
          error={error ?? undefined}
        />
      </form>
    </Modal>
  )
}
