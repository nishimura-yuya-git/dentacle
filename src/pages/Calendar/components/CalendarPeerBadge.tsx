import {
  calendarPeerBadgeText,
  calendarPeerBadgeTone,
} from '@/pages/Calendar/utils/calendarLivePeers'

type Size = 'sm' | 'md'

type Props = {
  pcLabel: number
  size?: Size
  className?: string
}

const SIZE_CLASS: Record<Size, string> = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-8 w-8 text-[10px]',
}

/** 他端末の丸アイコン。名前は出さない */
export function CalendarPeerBadge({ pcLabel, size = 'md', className = '' }: Props) {
  const label = calendarPeerBadgeText(pcLabel)
  return (
    <span
      className={[
        'inline-flex shrink-0 items-center justify-center rounded-full font-bold tabular-nums shadow-sm',
        SIZE_CLASS[size],
        calendarPeerBadgeTone(pcLabel),
        className,
      ].join(' ')}
      title={label}
      aria-label={label}
    >
      {label}
    </span>
  )
}
