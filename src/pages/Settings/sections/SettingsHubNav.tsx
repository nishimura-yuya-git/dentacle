import {
  SETTINGS_HUB_NAV,
  isSettingsHubItemActive,
  type SettingsSection,
} from '@/pages/Settings/settingsHub'

type Props = {
  section: SettingsSection
  onSelect: (section: SettingsSection) => void
}

const itemClass = (active: boolean) =>
  [
    'rounded-xl px-3 py-1.5 text-sm font-bold transition-colors',
    active ? 'bg-[#008C01]/10 text-[#008C01]' : 'text-slate-700 hover:bg-slate-50',
  ].join(' ')

/** 設定見出しの右端に置く切替タブ。 */
export function SettingsHubNav({ section, onSelect }: Props) {
  return (
    <nav className="flex flex-nowrap gap-1" aria-label="設定の表示">
      {SETTINGS_HUB_NAV.map((item) => {
        const active = isSettingsHubItemActive(item, section)
        return (
          <button
            key={item.id}
            type="button"
            className={itemClass(active)}
            aria-current={active ? 'page' : undefined}
            onClick={() => onSelect(item.id)}
          >
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}
