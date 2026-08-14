export type AccountMenuLink = {
  to: string
  label: string
  /** true のとき platform_admins（運営）だけ出す */
  requiresPlatformAdmin?: boolean
}

export const ACCOUNT_MENU_LINKS: AccountMenuLink[] = [
  { to: '/mypage', label: 'マイページ' },
  { to: '/announcements', label: 'お知らせ' },
  { to: '/progress', label: '改善の進捗', requiresPlatformAdmin: true },
  { to: '/security', label: '安全性' },
  { to: '/users', label: 'ユーザー管理（追加・編集・削除）' },
  { to: '/import', label: 'CSV取込' },
  { to: '/feedback', label: 'ご意見・不具合' },
  { to: '/account/contractor', label: '契約者情報' },
  { to: '/account/payments', label: 'お支払い履歴' },
  { to: '/account/contract', label: '契約情報' },
]

/** 院ユーザーには運営専用項目を出さない */
export function visibleAccountMenuLinks(isPlatformAdmin: boolean): AccountMenuLink[] {
  return ACCOUNT_MENU_LINKS.filter((item) => !item.requiresPlatformAdmin || isPlatformAdmin)
}
