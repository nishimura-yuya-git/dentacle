import { CalendarPeerBadge } from '@/pages/Calendar/components/CalendarPeerBadge'
import type { CalendarPeerView } from '@/pages/Calendar/utils/calendarLivePeers'

type Props = {
  peers: CalendarPeerView[]
}

/** 同じ日を開いている他端末。同一アカウントの別PCも含む */
export function CalendarPeerPresenceBar({ peers }: Props) {
  if (peers.length === 0) return null
  return (
    <div
      className="flex shrink-0 items-center gap-1"
      aria-label="他の端末"
    >
      {peers.map((peer) => (
        <CalendarPeerBadge key={peer.peerId} pcLabel={peer.pcLabel} />
      ))}
    </div>
  )
}
