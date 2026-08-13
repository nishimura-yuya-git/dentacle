export type PlatformAiView = 'proposals' | 'usage'

export type ProposalSection = 'conditions' | 'jobs'

export type ProposalsHubItemId = 'conditions' | 'jobs' | 'usage'

export type ProposalsHubItem = {
  id: ProposalsHubItemId
  label: string
  view: PlatformAiView
  section: ProposalSection | null
}

/** 見出し「自動提案」の右端（actions）に置くテキストタブ。Select は使わない。 */
export const PROPOSALS_HUB_NAV: readonly ProposalsHubItem[] = [
  { id: 'conditions', label: '条件設定', view: 'proposals', section: 'conditions' },
  { id: 'jobs', label: '最近のジョブ', view: 'proposals', section: 'jobs' },
  { id: 'usage', label: 'AI利用状況', view: 'usage', section: null },
]

export function viewFromSearch(params: URLSearchParams): PlatformAiView {
  return params.get('view') === 'usage' ? 'usage' : 'proposals'
}

export function isProposalsHubItemActive(
  item: ProposalsHubItem,
  view: PlatformAiView,
  section: ProposalSection,
): boolean {
  if (view === 'usage') return item.id === 'usage'
  return item.view === 'proposals' && item.section === section
}
