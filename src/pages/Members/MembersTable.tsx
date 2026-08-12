import {
  displayMemberName,
  memberRoleClass,
  roleLabel,
  type MemberRow,
} from '@/pages/Members/memberUi'
import { LockIcon, PencilIcon } from '@/pages/Members/MemberIcons'

type Props = {
  members: MemberRow[]
  clinicName: string
  loading: boolean
  canManage: boolean
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onEdit: (member: MemberRow) => void
}

export function MembersTable({
  members,
  clinicName,
  loading,
  canManage,
  page,
  pageSize,
  total,
  onPageChange,
  onEdit,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-4">
        <p className="text-sm font-bold text-slate-800">{total}名のメンバー</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-bold text-slate-500">
            <tr>
              <th className="whitespace-nowrap px-5 py-3">名前</th>
              <th className="whitespace-nowrap px-5 py-3">メール</th>
              <th className="whitespace-nowrap px-5 py-3">役割</th>
              <th className="whitespace-nowrap px-5 py-3">所属</th>
              <th className="whitespace-nowrap px-5 py-3">最終ログイン</th>
              <th className="whitespace-nowrap px-5 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                  読み込み中…
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                  条件に一致するメンバーがいません
                </td>
              </tr>
            ) : (
              members.map((member) => {
                const isOwner = member.role === 'owner'
                return (
                  <tr key={member.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-5 py-4 font-bold text-slate-900">
                      {displayMemberName(member)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                      {member.profiles?.email ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${memberRoleClass(member.role)}`}
                      >
                        {roleLabel(member.role)}
                      </span>
                    </td>
                    <td className="max-w-[200px] truncate px-5 py-4 text-slate-600" title={clinicName}>
                      {clinicName}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-400">—</td>
                    <td className="whitespace-nowrap px-5 py-4">
                      {isOwner || !canManage ? (
                        <span className="inline-flex items-center gap-2 text-slate-400" title="変更不可">
                          <LockIcon />
                          <span aria-hidden>—</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
                          onClick={() => onEdit(member)}
                        >
                          <PencilIcon />
                          編集
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-500 transition hover:bg-slate-100 disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="前のページ"
        >
          ‹
        </button>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#008C01] text-sm font-bold text-white">
          {page}
        </span>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-500 transition hover:bg-slate-100 disabled:opacity-40"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="次のページ"
        >
          ›
        </button>
      </div>
    </section>
  )
}
