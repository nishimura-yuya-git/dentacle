import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { ClinicAccessPlaceholder } from '@/features/clinic/ClinicAccessPlaceholder'
import { useClinic } from '@/features/clinic/useClinic'
import { supabase } from '@/lib/supabase'
import { CreateClinicModal } from '@/pages/Members/CreateClinicModal'
import { MemberEditModal } from '@/pages/Members/MemberEditModal'
import { MemberInviteDrawer } from '@/pages/Members/MemberInviteDrawer'
import { MemberSearchInput } from '@/pages/Members/MemberSearchInput'
import { MembersTable } from '@/pages/Members/MembersTable'
import { UserPlusIcon } from '@/pages/Members/MemberIcons'
import { MEMBERS_PAGE_SIZE, type MemberRow } from '@/pages/Members/memberUi'

export function MembersPage() {
  const { pathname } = useLocation()
  const {
    clinic,
    clinics,
    isAdmin,
    isPlatformAdmin,
    setClinicId,
    refreshAuthMemberships,
    clinicReady,
  } = useClinic()
  const toast = useToast()
  const isUserManagement = pathname.startsWith('/users')

  const [members, setMembers] = useState<MemberRow[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)

  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<MemberRow | null>(null)
  const [editRole, setEditRole] = useState('coordinator')

  const [clinicName, setClinicName] = useState('')
  const [clinicCode, setClinicCode] = useState('')
  const [memberEmail, setMemberEmail] = useState('')
  const [memberRole, setMemberRole] = useState('coordinator')
  const [inviteClinicId, setInviteClinicId] = useState('')

  const loadMembers = useCallback(async () => {
    if (!clinic) {
      setMembers([])
      return
    }
    setLoading(true)

    const [{ data, error: queryError }, { data: platformRows }] = await Promise.all([
      supabase
        .from('clinic_members')
        .select('id, role, user_id, profiles(email, display_name)')
        .eq('clinic_id', clinic.id)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('created_at', { ascending: true }),
      supabase.from('platform_admins').select('user_id'),
    ])

    if (queryError) {
      toast.error(queryError.message)
      setMembers([])
    } else {
      const platformIds = new Set((platformRows ?? []).map((row) => row.user_id))
      // 運営（スーパー権限）はユーザー管理に表示しない
      setMembers(
        ((data ?? []) as MemberRow[]).filter((member) => !platformIds.has(member.user_id)),
      )
    }
    setLoading(false)
  }, [clinic])

  useEffect(() => {
    void loadMembers()
  }, [loadMembers])

  useEffect(() => {
    if (clinic) setInviteClinicId(clinic.id)
  }, [clinic])

  useEffect(() => {
    setPage(1)
  }, [query, clinic?.id])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return members
    return members.filter((member) => {
      const name = (member.profiles?.display_name ?? '').toLowerCase()
      const email = (member.profiles?.email ?? '').toLowerCase()
      return name.includes(normalized) || email.includes(normalized)
    })
  }, [members, query])

  const pageItems = useMemo(() => {
    const start = (page - 1) * MEMBERS_PAGE_SIZE
    return filtered.slice(start, start + MEMBERS_PAGE_SIZE)
  }, [filtered, page])

  async function handleCreateClinic(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    const { data, error: rpcError } = await supabase.rpc('create_clinic_with_owner', {
      p_name: clinicName,
      p_code: clinicCode || null,
    })
    setBusy(false)
    if (rpcError) {
      toast.error(rpcError.message)
      return
    }
    toast.success('クリニックを作成しました')
    setClinicName('')
    setClinicCode('')
    setCreateOpen(false)
    await refreshAuthMemberships()
    if (typeof data === 'string') setClinicId(data)
  }

  async function handleInvite(event: FormEvent) {
    event.preventDefault()
    const targetClinicId = inviteClinicId || clinic?.id
    if (!targetClinicId) return
    setBusy(true)
    const { error: rpcError } = await supabase.rpc('add_clinic_member_by_email', {
      p_clinic_id: targetClinicId,
      p_email: memberEmail,
      p_role: memberRole,
    })
    setBusy(false)
    if (rpcError) {
      toast.error(rpcError.message)
      return
    }
    toast.success('メンバーを追加しました')
    setMemberEmail('')
    setInviteOpen(false)
    if (targetClinicId !== clinic?.id) setClinicId(targetClinicId)
    await loadMembers()
  }

  async function handleSaveEdit(event: FormEvent) {
    event.preventDefault()
    if (!editing) return
    setBusy(true)
    const { error: updateError } = await supabase
      .from('clinic_members')
      .update({ role: editRole, updated_at: new Date().toISOString() })
      .eq('id', editing.id)
    setBusy(false)
    if (updateError) {
      toast.error(updateError.message)
      return
    }
    toast.success('役割を更新しました')
    setEditing(null)
    await loadMembers()
  }

  const title = isUserManagement ? 'ユーザー管理' : '所属管理'
  const description = clinic?.name ?? 'クリニック未選択'

  return (
    <DashboardLayout
      title={title}
      description={description}
      titleAside={<MemberSearchInput value={query} onChange={setQuery} />}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {isPlatformAdmin ? (
            <Button
              type="button"
              variant="secondary"
              className="!px-4 !py-2.5 gap-2"
              onClick={() => setCreateOpen(true)}
            >
              <UserPlusIcon />
              クリニックを作成
            </Button>
          ) : null}
          <Button
            type="button"
            className="!px-4 !py-2.5 gap-2"
            disabled={!clinic || !isAdmin}
            onClick={() => setInviteOpen(true)}
          >
            <UserPlusIcon />
            メンバーを招待
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {!clinicReady ? (
          <ClinicAccessPlaceholder />
        ) : !clinic ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-medium text-slate-600">
              {isPlatformAdmin
                ? 'クリニックが未選択です。「クリニックを作成」から開始するか、ヘッダーで所属を選んでください。'
                : 'クリニックが未選択です。所属クリニックは運営が作成します。ヘッダーで所属を選ぶか、管理者へご連絡ください。'}
            </p>
          </section>
        ) : (
          <>
            <MembersTable
              members={pageItems}
              clinicName={clinic.name}
              loading={loading}
              canManage={isAdmin}
              page={page}
              pageSize={MEMBERS_PAGE_SIZE}
              total={filtered.length}
              onPageChange={setPage}
              onEdit={(member) => {
                setEditing(member)
                setEditRole(member.role === 'owner' ? 'admin' : member.role)
              }}
            />
            {!isAdmin ? (
              <p className="text-xs font-medium text-slate-400">
                メンバーの招待・編集はオーナー / 管理者のみ実行できます。
              </p>
            ) : null}
          </>
        )}
      </div>

      <CreateClinicModal
        open={createOpen}
        busy={busy}
        clinicName={clinicName}
        clinicCode={clinicCode}
        onClose={() => setCreateOpen(false)}
        onClinicNameChange={setClinicName}
        onClinicCodeChange={setClinicCode}
        onSubmit={handleCreateClinic}
      />

      <MemberInviteDrawer
        open={inviteOpen}
        busy={busy}
        clinics={clinics}
        clinicId={inviteClinicId}
        email={memberEmail}
        role={memberRole}
        onClose={() => setInviteOpen(false)}
        onClinicIdChange={setInviteClinicId}
        onEmailChange={setMemberEmail}
        onRoleChange={setMemberRole}
        onSubmit={handleInvite}
      />

      <MemberEditModal
        member={editing}
        busy={busy}
        role={editRole}
        onRoleChange={setEditRole}
        onClose={() => setEditing(null)}
        onSubmit={handleSaveEdit}
      />
    </DashboardLayout>
  )
}
