import type { FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { displayMemberName, type MemberRow } from '@/pages/Members/memberUi'
import { CLINIC_ROLES, roleLabel } from '@/utils/roleLabels'

type Props = {
  member: MemberRow | null
  busy: boolean
  role: string
  onRoleChange: (value: string) => void
  onClose: () => void
  onSubmit: (event: FormEvent) => void
}

export function MemberEditModal({
  member,
  busy,
  role,
  onRoleChange,
  onClose,
  onSubmit,
}: Props) {
  if (!member) return null

  const editableRoles = CLINIC_ROLES.filter((item) => item !== 'owner')

  return (
    <Modal
      isOpen={Boolean(member)}
      title="メンバーを編集"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            キャンセル
          </Button>
          <Button type="submit" form="edit-member-form" loading={busy}>
            保存する
          </Button>
        </div>
      }
    >
      <form id="edit-member-form" onSubmit={onSubmit} className="space-y-4">
        <div>
          <p className="text-xs font-bold text-slate-400">対象</p>
          <p className="mt-1 text-sm font-bold text-slate-900">{displayMemberName(member)}</p>
          <p className="text-xs font-medium text-slate-500">{member.profiles?.email}</p>
        </div>
        <Select
          label="役割"
          value={role}
          onChange={(e) => onRoleChange(e.target.value)}
          options={editableRoles.map((item) => ({
            value: item,
            label: roleLabel(item),
          }))}
        />
      </form>
    </Modal>
  )
}
