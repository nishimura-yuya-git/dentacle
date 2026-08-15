import { formatProductUpdateDate } from '../Announcements/formatProductUpdate.ts'

export const PLATFORM_ADMIN_TABLE_COLUMNS = ['名前', 'メール', 'メモ', '追加日', '操作'] as const

export function formatPlatformAdminName(item: {
  displayName: string | null
  email: string | null
}): string {
  const name = item.displayName?.trim()
  if (name) return name
  const email = item.email?.trim()
  if (email) return email
  return '名前未設定'
}

export function formatPlatformAdminDate(iso: string | null | undefined): string {
  return formatProductUpdateDate(iso)
}

export function formatPlatformAdminNote(note: string | null | undefined): string {
  const value = note?.trim()
  return value ? value : '—'
}

export function formatPlatformAdminEmptyCopy(): string {
  return '運営はまだいません。右上からメールで招待できます。'
}

export function formatPlatformAdminGrantCopy() {
  return {
    title: '運営を追加',
    description:
      '入力したメールに招待を送ります。届いたリンクからパスワードを設定し、ログインしてください。クリニック所属の人には付けられません。',
    submitLabel: '招待メールを送る',
    successInvited: '招待メールを送りました。',
    successExisting: 'すでにアカウントがあるため、運営に追加しました。',
  }
}

export function formatPlatformAdminEditCopy() {
  return {
    title: '運営を編集',
    success: '運営を保存しました。',
  }
}

export function formatPlatformAdminRevokeCopy() {
  return {
    title: '運営を削除',
    confirm: 'この人の運営権限を削除しますか。自分と最後の1人は削除できません。',
    success: '運営を削除しました。',
  }
}
