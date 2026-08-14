export type SettingsSection = 'lane' | 'teams' | 'staff' | 'slots'

export type SettingsHubItem = {
  id: SettingsSection
  label: string
}

/** 見出し「設定」の右端に置くセグメント切替。Select は使わない。 */
export const SETTINGS_HUB_NAV: readonly SettingsHubItem[] = [
  { id: 'lane', label: '導入タイプ' },
  { id: 'teams', label: 'チーム' },
  { id: 'staff', label: '担当' },
  { id: 'slots', label: '稼働枠' },
]

export function isSettingsHubItemActive(
  item: SettingsHubItem,
  section: SettingsSection,
): boolean {
  return item.id === section
}
