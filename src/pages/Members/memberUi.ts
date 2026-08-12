import { roleLabel } from '@/utils/roleLabels'

/** ユーザー管理の1ページあたり件数（11人目から次ページ） */
export const MEMBERS_PAGE_SIZE = 10

export type MemberRow = {
  id: string
  role: string
  user_id: string
  profiles: { email: string | null; display_name: string | null } | null
}

export function memberRoleClass(role: string): string {
  const map: Record<string, string> = {
    owner: 'bg-sky-50 text-sky-700 border-sky-200',
    admin: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    coordinator: 'bg-violet-50 text-violet-700 border-violet-200',
    call: 'bg-amber-50 text-amber-700 border-amber-200',
    doctor: 'bg-teal-50 text-teal-700 border-teal-200',
    dh: 'bg-slate-100 text-slate-600 border-slate-200',
  }
  return map[role] ?? 'bg-slate-100 text-slate-600 border-slate-200'
}

export function displayMemberName(member: MemberRow): string {
  return member.profiles?.display_name || member.profiles?.email || '名前未設定'
}

export { roleLabel }
