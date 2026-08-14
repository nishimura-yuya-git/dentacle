import type {
  ReleaseChipBadgePlacement,
  ReleaseChipBadgeTone,
} from '@/pages/Announcements/releaseChipDisplay'

const BADGE_PLACEMENT_CLASS: Record<ReleaseChipBadgePlacement, string> = {
  'top-end': 'absolute -top-2.5 -right-4',
  'bottom-end': 'absolute -bottom-1.5 -right-1.5',
}

const BADGE_TONE_CLASS: Record<ReleaseChipBadgeTone, string> = {
  'in-progress':
    'origin-center rotate-[8deg] whitespace-nowrap rounded-full border border-sky-100 bg-white px-1.5 py-px text-[10px] font-bold text-sky-400 shadow-sm',
  kind: 'rounded-full border border-slate-200 bg-white px-1.5 py-px text-[10px] font-bold text-slate-400',
}

/**
 * 見本の白タグ。beta / 国旗 / WIP 英語は置かない。
 * 予定の開発中は右上。済みの種類は右下。
 */
export function ReleaseChip({
  label,
  badge,
  badgePlacement = 'bottom-end',
  badgeTone = 'kind',
  selected,
  onClick,
}: {
  label: string
  badge?: string
  badgePlacement?: ReleaseChipBadgePlacement
  badgeTone?: ReleaseChipBadgeTone
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={[
        'relative rounded-full border bg-white px-4 py-2 text-left text-sm font-medium text-slate-700 shadow-sm',
        'transition-colors hover:border-slate-300',
        selected ? 'border-[#008C01] ring-2 ring-[#008C01]/15' : 'border-slate-200/90',
      ].join(' ')}
    >
      {label}
      {badge ? (
        <span className={`${BADGE_PLACEMENT_CLASS[badgePlacement]} ${BADGE_TONE_CLASS[badgeTone]}`}>
          {badge}
        </span>
      ) : null}
    </button>
  )
}
