import { useState, type FormEvent } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/features/auth/useAuth'
import { EditAdminModal } from '@/pages/Admins/components/EditAdminModal'
import { GrantAdminModal } from '@/pages/Admins/components/GrantAdminModal'
import { RevokeAdminModal } from '@/pages/Admins/components/RevokeAdminModal'
import {
  formatPlatformAdminEditCopy,
  formatPlatformAdminGrantCopy,
  formatPlatformAdminRevokeCopy,
} from '@/pages/Admins/formatPlatformAdmin'
import { usePlatformAdmins } from '@/pages/Admins/hooks/usePlatformAdmins'
import type { PlatformAdminView } from '@/pages/Admins/platformAdminTypes'
import { AdminList } from '@/pages/Admins/sections/AdminList'

const ADMINS_ARTICLE_CLASS =
  '-mx-3 -my-2 flex min-h-0 flex-1 flex-col overflow-hidden bg-white px-5 py-5 font-normal leading-[1.7] text-[16px] text-slate-900 md:-mx-4 md:-my-3 md:px-8 md:py-6'

export function AdminsPage() {
  const toast = useToast()
  const { user } = useAuth()
  const { items, loading, error, busyId, grant, update, revoke } = usePlatformAdmins()
  const [grantOpen, setGrantOpen] = useState(false)
  const [grantEmail, setGrantEmail] = useState('')
  const [grantError, setGrantError] = useState<string | null>(null)
  const [editTarget, setEditTarget] = useState<PlatformAdminView | null>(null)
  const [editName, setEditName] = useState('')
  const [editNote, setEditNote] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<PlatformAdminView | null>(null)

  function openEdit(userId: string) {
    const target = items.find((item) => item.userId === userId) ?? null
    setEditTarget(target)
    setEditName(target?.displayName ?? '')
    setEditNote(target?.note ?? '')
    setEditError(null)
  }

  async function handleGrant(event: FormEvent) {
    event.preventDefault()
    setGrantError(null)
    const result = await grant(grantEmail)
    if (!result.ok) {
      setGrantError(result.message)
      return
    }
    const copy = formatPlatformAdminGrantCopy()
    toast.success(result.invited ? copy.successInvited : copy.successExisting)
    setGrantEmail('')
    setGrantOpen(false)
  }

  async function handleEdit(event: FormEvent) {
    event.preventDefault()
    if (!editTarget) return
    setEditError(null)
    const result = await update(editTarget.userId, editName, editNote)
    if (!result.ok) {
      setEditError(result.message)
      return
    }
    toast.success(formatPlatformAdminEditCopy().success)
    setEditTarget(null)
  }

  async function handleRevoke() {
    if (!revokeTarget) return
    const result = await revoke(revokeTarget.userId)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    toast.success(formatPlatformAdminRevokeCopy().success)
    setRevokeTarget(null)
  }

  return (
    <DashboardLayout
      title="運営"
      description="Dentacle運営の一覧。院のユーザー管理とは別です。"
      fillViewport
      actions={
        <Button type="button" onClick={() => setGrantOpen(true)}>
          運営を追加
        </Button>
      }
    >
      <article className={ADMINS_ARTICLE_CLASS}>
        {error ? (
          <p className="text-sm font-medium text-rose-600">{error}</p>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-auto rounded-2xl border border-slate-200 bg-white">
            <AdminList
              items={items}
              loading={loading}
              selfUserId={user?.id ?? null}
              busyId={busyId}
              onEdit={openEdit}
              onRevoke={(userId) => {
                const target = items.find((item) => item.userId === userId) ?? null
                setRevokeTarget(target)
              }}
            />
          </div>
        )}
      </article>

      <GrantAdminModal
        open={grantOpen}
        busy={busyId === 'grant'}
        email={grantEmail}
        error={grantError}
        onClose={() => {
          if (busyId === 'grant') return
          setGrantOpen(false)
          setGrantError(null)
        }}
        onEmailChange={(value) => {
          setGrantEmail(value)
          setGrantError(null)
        }}
        onSubmit={(event) => void handleGrant(event)}
      />
      <EditAdminModal
        target={editTarget}
        busy={busyId === editTarget?.userId}
        displayName={editName}
        note={editNote}
        error={editError}
        onClose={() => {
          if (busyId === editTarget?.userId) return
          setEditTarget(null)
          setEditError(null)
        }}
        onDisplayNameChange={(value) => {
          setEditName(value)
          setEditError(null)
        }}
        onNoteChange={(value) => {
          setEditNote(value)
          setEditError(null)
        }}
        onSubmit={(event) => void handleEdit(event)}
      />
      <RevokeAdminModal
        target={revokeTarget}
        busy={busyId === revokeTarget?.userId}
        onClose={() => {
          if (busyId === revokeTarget?.userId) return
          setRevokeTarget(null)
        }}
        onConfirm={() => void handleRevoke()}
      />
    </DashboardLayout>
  )
}
