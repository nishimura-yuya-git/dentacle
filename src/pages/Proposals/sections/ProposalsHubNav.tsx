import { SegmentedControl } from '@/components/ui/SegmentedControl'
import {
  PROPOSALS_HUB_NAV,
  isProposalsHubItemActive,
  type PlatformAiView,
  type ProposalSection,
  type ProposalsHubItem,
  type ProposalsHubItemId,
} from '@/pages/Proposals/proposalsHub'

type Props = {
  view: PlatformAiView
  section: ProposalSection
  onSelect: (item: ProposalsHubItem) => void
}

function activeHubId(view: PlatformAiView, section: ProposalSection): ProposalsHubItemId {
  return (
    PROPOSALS_HUB_NAV.find((item) => isProposalsHubItemActive(item, view, section))?.id ??
    'conditions'
  )
}

/** 自動提案見出しの右端に置く切替。灰トラック＋白ピル。 */
export function ProposalsHubNav({ view, section, onSelect }: Props) {
  return (
    <SegmentedControl
      ariaLabel="自動提案の表示"
      tone="nav"
      value={activeHubId(view, section)}
      options={PROPOSALS_HUB_NAV.map((item) => ({
        value: item.id,
        label: item.label,
      }))}
      onChange={(id) => {
        const item = PROPOSALS_HUB_NAV.find((entry) => entry.id === id)
        if (item) onSelect(item)
      }}
    />
  )
}
