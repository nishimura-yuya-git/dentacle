export type AppNavMenuItem = {
  to: string
  label: string
}

export type AppNavItem = {
  to: string
  label: string
  end?: boolean
  /** ラベル左に置く装飾アイコン（public 配下のパス） */
  iconSrc?: string
  /** このパス配下もナビ選択中とみなす（例: 患者管理内の一覧 ↔ 電話確認） */
  matchPrefixes?: string[]
  /** ある場合は「ラベル ▼」ドロップダウンで切替 */
  menuItems?: AppNavMenuItem[]
  /** true のとき platform_admins（運営）のみナビ表示 */
  requiresPlatformAdmin?: boolean
}

/**
 * 左サイドバー用。患者管理は ▼ で患者一覧／電話確認を切り替える。
 */
export const APP_NAV: AppNavItem[] = [
  { to: '/calendar', label: '診療カレンダー', iconSrc: '/icon/calendar.png' },
  {
    to: '/proposals',
    label: '自動提案',
    iconSrc: '/icon/ai.png',
    requiresPlatformAdmin: true,
    /** 旧 `/admin/ai-usage` 直リンクも選択中扱い */
    matchPrefixes: ['/proposals', '/admin/ai-usage'],
  },
  {
    to: '/patients',
    label: '患者管理',
    iconSrc: '/icon/patient.png',
    matchPrefixes: ['/patients', '/contacts'],
    menuItems: [
      { to: '/patients', label: '患者一覧' },
      { to: '/contacts', label: '電話確認' },
    ],
  },
  { to: '/operations', label: '操作ログ', iconSrc: '/icon/windows.png' },
  {
    to: '/auth-audit',
    label: 'ログイン監査',
    iconSrc: '/icon/audit.png',
    requiresPlatformAdmin: true,
  },
  { to: '/settings', label: '設定', iconSrc: '/icon/gears.png' },
]

export const TOP_NAV = APP_NAV

export function isNavItemActive(pathname: string, item: AppNavItem): boolean {
  if (item.matchPrefixes?.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return true
  }
  if (item.end) return pathname === item.to
  return pathname === item.to || pathname.startsWith(`${item.to}/`)
}
