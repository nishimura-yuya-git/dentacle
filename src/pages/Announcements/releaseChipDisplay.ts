/** お知らせのリリース面。見本はチップ雲の部品だけ借りる。beta / 国旗 / WIP 英語は借りない。 */

import type { ProductUpdateStatus } from '@/pages/Announcements/productUpdatePolicy'

export const RELEASE_CHIP_SECTIONS = ['upcoming', 'published'] as const
export type ReleaseChipSection = (typeof RELEASE_CHIP_SECTIONS)[number]

export const RELEASE_CHIP_BADGE_PLACEMENTS = ['top-end', 'bottom-end'] as const
export type ReleaseChipBadgePlacement = (typeof RELEASE_CHIP_BADGE_PLACEMENTS)[number]

export const RELEASE_CHIP_BADGE_TONES = ['in-progress', 'kind'] as const
export type ReleaseChipBadgeTone = (typeof RELEASE_CHIP_BADGE_TONES)[number]

export type ReleaseChipBadge = {
  label: string
  placement: ReleaseChipBadgePlacement
  tone: ReleaseChipBadgeTone
}

/** 見本の WIP 形。文言は日本語の「開発中」。 */
export const RELEASE_IN_PROGRESS_BADGE_LABEL = '開発中'

export function formatReleaseChipBadge(args: {
  status: ProductUpdateStatus
  kindLabel: string
  showInProgressBadge?: boolean
}): ReleaseChipBadge | null {
  if (args.status === 'proposed') {
    if (args.showInProgressBadge === false) return null
    return {
      label: RELEASE_IN_PROGRESS_BADGE_LABEL,
      placement: 'top-end',
      tone: 'in-progress',
    }
  }

  if (args.status === 'published') {
    return {
      label: args.kindLabel,
      placement: 'bottom-end',
      tone: 'kind',
    }
  }

  return null
}

export function formatReleaseSectionTitle(section: ReleaseChipSection): string {
  return section === 'published' ? '更新情報' : 'リリース予定'
}

/** リリース予定見出し左。 */
export const RELEASE_UPCOMING_MARK_SRC = '/icon/optimization.png'

/** リリース済み見出し左。見本の火印は使わない。 */
export const RELEASE_PUBLISHED_MARK_SRC = '/icon/solution.png'

export function releaseSectionMarkSrc(section: ReleaseChipSection): string {
  return section === 'published' ? RELEASE_PUBLISHED_MARK_SRC : RELEASE_UPCOMING_MARK_SRC
}

export function formatReleaseChipEmptyCopy(section: ReleaseChipSection): string {
  return section === 'published'
    ? '更新情報はまだありません。'
    : 'リリース予定はまだありません。'
}

/** 斜線面の登録ボタン。全体の主色 #008C01 は変えない。 */
export const RELEASE_PANEL_ACTION_CLASS =
  '!border-transparent !bg-[#6BB86B] !text-white !shadow-none hover:!bg-[#5CAD5C] focus-visible:!ring-[#6BB86B]/30'

/** お知らせ見出し右の登録。濃い主色面は使わず、淡い緑にする。 */
export const ANNOUNCEMENT_HEADER_ACTION_CLASS =
  '!border-emerald-100 !bg-emerald-50 !text-[#008C01] !shadow-none hover:!bg-emerald-100 focus-visible:!ring-[#008C01]/20'
