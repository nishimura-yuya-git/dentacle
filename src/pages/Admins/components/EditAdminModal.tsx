import { type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { formatPlatformAdminEditCopy } from '@/pages/Admins/formatPlatformAdmin'
import type { PlatformAdminView } from '@/pages/Admins/platformAdminTypes'

export function EditAdminModal({
  target,
  busy,
  displayName,
  note,
  error,
  onClose,
  onDisplayNameChange,
  onNoteChange,
  onSubmit,
}: {
  target: PlatformAdminView | null
  busy: boolean
  displayName: string
  note: string
  error: string | null
  onClose: () => void
  onDisplayNameChange: (value: string) => void
  onNoteChange: (value: string) => void
  onSubmit: (event: FormEvent) => void
}) {
  const copy = formatPlatformAdminEditCopy()

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
          <Button type="submit" form="edit-admin-form" loading={busy}>
            保存する
          </Button>
        </div>
      }
    >
      <form id="edit-admin-form" onSubmit={onSubmit} className="space-y-5">
        <div>
          <p className="text-xs font-bold text-slate-400">メール</p>
          <p className="mt-1 text-sm font-medium text-slate-700">{target?.email ?? '—'}</p>
          <p className="mt-1 text-xs font-medium text-slate-400">
            メールの変更はこの画面ではできません。
          </p>
        </div>
        <Input
          label="表示名"
          name="admin-display-name"
          autoComplete="off"
          value={displayName}
          onChange={(event) => onDisplayNameChange(event.target.value)}
          maxLength={80}
        />
        <div className="space-y-2">
          <label htmlFor="admin-note" className="block text-sm font-bold text-slate-800">
            メモ
          </label>
          <textarea
            id="admin-note"
            name="admin-note"
            rows={3}
            maxLength={200}
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#008C01] focus:ring-4 focus:ring-[#008C01]/20"
          />
        </div>
        {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
      </form>
    </Modal>
  )
}
