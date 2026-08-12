/**
 * 導入2レーン（§6.18）向けの Day0 提案プリセット。
 * 細かいスイッチ山ではなく、スピードと件数の差だけをここで定義する。
 */

export type IntroductionLane = 'startup' | 'existing'

export type ProposalLanePreset = {
  lane: IntroductionLane
  label: string
  summary: string
  /** 1日あたりの最大割付件数 */
  maxSlots: number
  dayStart: string
  /** この時刻を超える枠は作らない（HH:mm:ss） */
  dayEnd: string
  travelGapMinutes: number
  /** 希望曜日が合う患者を優先して並べる */
  preferMatchingWeekdayFirst: boolean
}

export const PROPOSAL_LANE_PRESETS: Record<IntroductionLane, ProposalLanePreset> = {
  startup: {
    lane: 'startup',
    label: '立ち上げ',
    summary: '少数から素早く仮案。短めの稼働帯で当日の型を作る。',
    maxSlots: 10,
    dayStart: '09:00:00',
    dayEnd: '13:00:00',
    travelGapMinutes: 15,
    preferMatchingWeekdayFirst: true,
  },
  existing: {
    lane: 'existing',
    label: '既存導入',
    summary: 'CSV種まき後も多めに仮案。施設・エリアまとめを優先して埋める。',
    maxSlots: 36,
    dayStart: '09:00:00',
    dayEnd: '18:00:00',
    travelGapMinutes: 10,
    preferMatchingWeekdayFirst: true,
  },
}

export const DEFAULT_INTRODUCTION_LANE: IntroductionLane = 'startup'

export function isIntroductionLane(value: unknown): value is IntroductionLane {
  return value === 'startup' || value === 'existing'
}

export function getProposalLanePreset(lane: IntroductionLane): ProposalLanePreset {
  return PROPOSAL_LANE_PRESETS[lane]
}

export function timeToSeconds(value: string): number {
  const [h, m, s] = value.slice(0, 8).split(':').map(Number)
  return h * 3600 + m * 60 + (s || 0)
}
