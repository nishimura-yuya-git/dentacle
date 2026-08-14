import { SegmentedControl } from '@/components/ui/SegmentedControl'
import {
  SETTINGS_HUB_NAV,
  type SettingsSection,
} from '@/pages/Settings/settingsHub'

type Props = {
  section: SettingsSection
  onSelect: (section: SettingsSection) => void
}

/** 設定見出しの右端に置く切替。灰トラック＋白ピル。 */
export function SettingsHubNav({ section, onSelect }: Props) {
  return (
    <SegmentedControl
      ariaLabel="設定の表示"
      tone="nav"
      value={section}
      options={SETTINGS_HUB_NAV.map((item) => ({
        value: item.id,
        label: item.label,
      }))}
      onChange={onSelect}
    />
  )
}
