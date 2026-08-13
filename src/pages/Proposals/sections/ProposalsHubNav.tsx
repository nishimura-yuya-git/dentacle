import {
  PROPOSALS_HUB_NAV,
  isProposalsHubItemActive,
  type PlatformAiView,
  type ProposalSection,
  type ProposalsHubItem,
} from '@/pages/Proposals/proposalsHub'

type Props = {
  view: PlatformAiView
  section: ProposalSection
  onSelect: (item: ProposalsHubItem) => void
}

const itemClass = (active: boolean) =>
  [
    'rounded-xl px-3 py-1.5 text-sm font-bold transition-colors',
    active ? 'bg-[#008C01]/10 text-[#008C01]' : 'text-slate-700 hover:bg-slate-50',
  ].join(' ')

/** 自動提案見出しの右端に置く切替タブ。 */
export function ProposalsHubNav({ view, section, onSelect }: Props) {
  return (
    <nav className="flex flex-nowrap gap-1" aria-label="自動提案の表示">
      {PROPOSALS_HUB_NAV.map((item) => {
        const active = isProposalsHubItemActive(item, view, section)
        return (
          <button
            key={item.id}
            type="button"
            className={itemClass(active)}
            aria-current={active ? 'page' : undefined}
            onClick={() => onSelect(item)}
          >
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}
