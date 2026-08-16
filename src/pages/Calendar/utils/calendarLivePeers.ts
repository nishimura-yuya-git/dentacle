/** 心拍が途絶えた端末は表示しない（心拍4秒 × 3回分） */
export const CALENDAR_PEER_STALE_MS = 12_000
export const CALENDAR_PEER_HEARTBEAT_MS = 4_000
export const CALENDAR_PEER_DRAG_THROTTLE_MS = 80

export type CalendarLiveDragMode = 'move' | 'resize' | 'create'

export type CalendarLiveDrag = {
  mode: CalendarLiveDragMode
  visitId: string | null
  teamId: string
  startTime: string
  endTime: string
}

export type CalendarLivePublish = {
  focusVisitId: string | null
  drag: CalendarLiveDrag | null
}

export type CalendarPeerView = {
  peerId: string
  pcLabel: number
  focusVisitId: string | null
  drag: CalendarLiveDrag | null
  lastSeenAt: string
}

const PEER_BADGE_TONES = [
  'bg-slate-700 text-white',
  'bg-indigo-600 text-white',
  'bg-amber-600 text-white',
  'bg-rose-600 text-white',
  'bg-cyan-700 text-white',
  'bg-violet-600 text-white',
  'bg-orange-600 text-white',
  'bg-teal-700 text-white',
] as const

export function claimPcLabel(taken: number[]): number {
  const used = new Set(taken.filter((value) => value >= 1 && value <= 99))
  for (let label = 1; label <= 99; label += 1) {
    if (!used.has(label)) return label
  }
  return 99
}

export function calendarPeerBadgeText(pcLabel: number): string {
  return `PC${pcLabel}`
}

export function calendarPeerBadgeTone(pcLabel: number): string {
  const index = Math.max(0, pcLabel - 1) % PEER_BADGE_TONES.length
  return PEER_BADGE_TONES[index]
}

export function isCalendarPeerFresh(
  lastSeenAt: string,
  nowMs: number = Date.now(),
  staleMs: number = CALENDAR_PEER_STALE_MS,
): boolean {
  const seen = new Date(lastSeenAt).getTime()
  if (Number.isNaN(seen)) return false
  return nowMs - seen <= staleMs
}

export function sameCalendarPeerId(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

export function otherCalendarPeers(
  peers: CalendarPeerView[],
  selfPeerId: string,
  nowMs: number = Date.now(),
): CalendarPeerView[] {
  return peers
    .filter(
      (peer) =>
        !sameCalendarPeerId(peer.peerId, selfPeerId) &&
        isCalendarPeerFresh(peer.lastSeenAt, nowMs),
    )
    .sort((a, b) => a.pcLabel - b.pcLabel || a.peerId.localeCompare(b.peerId))
}

export type CalendarOccupyingVisit = {
  id: string
  team_id: string | null
  start_time: string
  end_time: string
}

export function calendarSlotKey(
  teamId: string | null | undefined,
  startTime: string,
  endTime: string,
): string {
  return `${teamId ?? ''}|${startTime.slice(0, 5)}|${endTime.slice(0, 5)}`
}

export function visitOccupiesLiveDrag(
  visit: CalendarOccupyingVisit,
  drag: CalendarLiveDrag,
): boolean {
  if (!drag.visitId || visit.id !== drag.visitId) return false
  return (
    calendarSlotKey(visit.team_id, visit.start_time, visit.end_time) ===
    calendarSlotKey(drag.teamId, drag.startTime, drag.endTime)
  )
}

/** まだ元位置に残っている枠だけ隠す。保存後の同位置は実枠を出す */
export function shouldHideVisitForRemotePeers(
  visit: CalendarOccupyingVisit,
  peers: CalendarPeerView[],
): boolean {
  return peers.some((peer) => {
    if (peer.drag?.mode !== 'move' || peer.drag.visitId !== visit.id) return false
    return !visitOccupiesLiveDrag(visit, peer.drag)
  })
}

export function remoteGhostsForTeam(
  peers: CalendarPeerView[],
  teamId: string,
  options?: {
    occupyingVisits?: CalendarOccupyingVisit[]
    ignoreVisitIds?: string[]
  },
): Array<CalendarLiveDrag & { peerId: string; pcLabel: number }> {
  const occupying = options?.occupyingVisits ?? []
  const ignore = new Set(options?.ignoreVisitIds ?? [])
  const ghosts = peers.flatMap((peer) => {
    const drag = peer.drag
    if (!drag || drag.teamId !== teamId) return []
    if (drag.visitId && ignore.has(drag.visitId)) return []
    if (drag.visitId && occupying.some((visit) => visitOccupiesLiveDrag(visit, drag))) {
      return []
    }
    return [{ ...drag, peerId: peer.peerId, pcLabel: peer.pcLabel }]
  })
  const seen = new Set<string>()
  return ghosts.filter((ghost) => {
    const key = ghost.visitId
      ? `visit:${ghost.visitId}`
      : `peer:${ghost.peerId}:${ghost.startTime}:${ghost.endTime}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** ドロップ直後はゴーストを残さない。移動中だけ間引く */
export function calendarPeerPublishDelayMs(
  next: CalendarLivePublish,
  prev: CalendarLivePublish | null,
): number {
  if (prev?.drag && !next.drag) return 0
  return CALENDAR_PEER_DRAG_THROTTLE_MS
}

export function dedupeCalendarPeers(peers: CalendarPeerView[]): CalendarPeerView[] {
  const seen = new Set<string>()
  return peers.filter((peer) => {
    const id = peer.peerId.trim().toLowerCase()
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
}

export function focusPeersForVisit(
  peers: CalendarPeerView[],
  visitId: string,
): CalendarPeerView[] {
  return peers.filter((peer) => peer.focusVisitId === visitId)
}

export function remoteHideVisitIds(peers: CalendarPeerView[]): string[] {
  return peers.flatMap((peer) => {
    if (peer.drag?.mode === 'move' && peer.drag.visitId) return [peer.drag.visitId]
    return []
  })
}

type GridDragSnapshot = {
  mode: CalendarLiveDragMode
  visitId: string | null
  teamId: string
  startTime: string
  endTime: string
  /** move で閾値未達なら false。他端末は枠の丸だけ出す */
  preview: boolean
}

export function toCalendarLivePublish(input: {
  drag: GridDragSnapshot | null
  detailVisitId: string | null
  createPreview: {
    teamId: string
    startTime: string
    endTime: string
  } | null
}): CalendarLivePublish {
  if (input.drag?.mode === 'move') {
    return {
      focusVisitId: input.drag.visitId,
      drag: input.drag.preview
        ? {
            mode: 'move',
            visitId: input.drag.visitId,
            teamId: input.drag.teamId,
            startTime: input.drag.startTime,
            endTime: input.drag.endTime,
          }
        : null,
    }
  }
  if (input.drag?.mode === 'resize') {
    return {
      focusVisitId: input.drag.visitId,
      drag: {
        mode: 'resize',
        visitId: input.drag.visitId,
        teamId: input.drag.teamId,
        startTime: input.drag.startTime,
        endTime: input.drag.endTime,
      },
    }
  }
  if (input.drag?.mode === 'create') {
    return {
      focusVisitId: null,
      drag: {
        mode: 'create',
        visitId: null,
        teamId: input.drag.teamId,
        startTime: input.drag.startTime,
        endTime: input.drag.endTime,
      },
    }
  }
  if (input.createPreview?.teamId) {
    return {
      focusVisitId: null,
      drag: {
        mode: 'create',
        visitId: null,
        teamId: input.createPreview.teamId,
        startTime: input.createPreview.startTime,
        endTime: input.createPreview.endTime,
      },
    }
  }
  return {
    focusVisitId: input.detailVisitId,
    drag: null,
  }
}

export function parseCalendarPeerRow(row: {
  peer_id: string
  pc_label: number
  focus_visit_id: string | null
  drag_mode: string | null
  drag_visit_id: string | null
  drag_team_id: string | null
  drag_start_time: string | null
  drag_end_time: string | null
  last_seen_at: string
}): CalendarPeerView {
  const mode = row.drag_mode
  const drag: CalendarLiveDrag | null =
    (mode === 'move' || mode === 'resize' || mode === 'create') &&
    row.drag_team_id &&
    row.drag_start_time &&
    row.drag_end_time
      ? {
          mode,
          visitId: row.drag_visit_id,
          teamId: row.drag_team_id,
          startTime: String(row.drag_start_time).slice(0, 5),
          endTime: String(row.drag_end_time).slice(0, 5),
        }
      : null

  return {
    peerId: row.peer_id.trim().toLowerCase(),
    pcLabel: row.pc_label,
    focusVisitId: row.focus_visit_id,
    drag,
    lastSeenAt: row.last_seen_at,
  }
}
