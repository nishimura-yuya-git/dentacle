import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { readOrCreateCalendarPeerId } from '@/pages/Calendar/utils/calendarPeerSession'
import {
  CALENDAR_PEER_HEARTBEAT_MS,
  calendarPeerPublishDelayMs,
  claimPcLabel,
  dedupeCalendarPeers,
  otherCalendarPeers,
  parseCalendarPeerRow,
  toCalendarLivePublish,
  type CalendarLivePublish,
  type CalendarPeerView,
} from '@/pages/Calendar/utils/calendarLivePeers'

type PeerRow = {
  peer_id: string
  pc_label: number
  focus_visit_id: string | null
  drag_mode: string | null
  drag_visit_id: string | null
  drag_team_id: string | null
  drag_start_time: string | null
  drag_end_time: string | null
  last_seen_at: string
}

type GridDrag = Parameters<typeof toCalendarLivePublish>[0]['drag']

type Props = {
  clinicId: string | undefined
  userId: string | undefined
  date: string
  detailVisitId: string | null
  createPreview: { teamId: string; startTime: string; endTime: string } | null
}

const PEER_COLUMNS =
  'peer_id, pc_label, focus_visit_id, drag_mode, drag_visit_id, drag_team_id, drag_start_time, drag_end_time, last_seen_at'

export function useCalendarLivePeers({
  clinicId,
  userId,
  date,
  detailVisitId,
  createPreview,
}: Props) {
  const [selfPeerId, setSelfPeerId] = useState<string | null>(null)
  const [pcLabel, setPcLabel] = useState<number | null>(null)
  const [peers, setPeers] = useState<CalendarPeerView[]>([])
  const [gridDrag, setGridDrag] = useState<GridDrag>(null)
  const pcLabelRef = useRef<number | null>(null)
  const presenceKeyRef = useRef<{
    clinicId: string
    date: string
    peerId: string
  } | null>(null)
  const prevPublishRef = useRef<CalendarLivePublish | null>(null)

  const publish = useMemo(
    () =>
      toCalendarLivePublish({
        drag: gridDrag,
        detailVisitId,
        createPreview,
      }),
    [createPreview, detailVisitId, gridDrag],
  )
  const publishRef = useRef(publish)
  publishRef.current = publish

  const loadPeers = useCallback(async () => {
    if (!clinicId) return
    const { data, error } = await supabase
      .from('clinic_calendar_peers')
      .select(PEER_COLUMNS)
      .eq('clinic_id', clinicId)
      .eq('scheduled_date', date)
    if (error || !data) return
    setPeers(dedupeCalendarPeers((data as PeerRow[]).map(parseCalendarPeerRow)))
  }, [clinicId, date])

  const upsertSelf = useCallback(
    async (nextPublish: CalendarLivePublish, label: number, peerId: string) => {
      if (!clinicId || !userId) return
      const now = new Date().toISOString()
      await supabase.from('clinic_calendar_peers').upsert(
        {
          clinic_id: clinicId,
          scheduled_date: date,
          peer_id: peerId,
          user_id: userId,
          pc_label: label,
          focus_visit_id: nextPublish.focusVisitId,
          drag_mode: nextPublish.drag?.mode ?? null,
          drag_visit_id: nextPublish.drag?.visitId ?? null,
          drag_team_id: nextPublish.drag?.teamId ?? null,
          drag_start_time: nextPublish.drag?.startTime ?? null,
          drag_end_time: nextPublish.drag?.endTime ?? null,
          last_seen_at: now,
          updated_at: now,
        },
        { onConflict: 'clinic_id,scheduled_date,peer_id' },
      )
    },
    [clinicId, date, userId],
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    setSelfPeerId(readOrCreateCalendarPeerId(window.sessionStorage))
  }, [])

  useEffect(() => {
    if (!clinicId || !userId || !selfPeerId) return
    let cancelled = false
    const previous = presenceKeyRef.current
    if (
      previous &&
      (previous.clinicId !== clinicId ||
        previous.date !== date ||
        previous.peerId !== selfPeerId)
    ) {
      void supabase
        .from('clinic_calendar_peers')
        .delete()
        .eq('clinic_id', previous.clinicId)
        .eq('scheduled_date', previous.date)
        .eq('peer_id', previous.peerId)
    }
    presenceKeyRef.current = { clinicId, date, peerId: selfPeerId }

    const join = async () => {
      const { data: mine } = await supabase
        .from('clinic_calendar_peers')
        .select('pc_label')
        .eq('clinic_id', clinicId)
        .eq('scheduled_date', date)
        .eq('peer_id', selfPeerId)
        .maybeSingle()
      if (cancelled) return
      let label = mine?.pc_label ?? null
      if (!label) {
        const { data: others } = await supabase
          .from('clinic_calendar_peers')
          .select('pc_label')
          .eq('clinic_id', clinicId)
          .eq('scheduled_date', date)
        if (cancelled) return
        label = claimPcLabel((others ?? []).map((row) => row.pc_label))
      }
      if (cancelled) return
      pcLabelRef.current = label
      setPcLabel(label)
      await upsertSelf(publishRef.current, label, selfPeerId)
      if (!cancelled) await loadPeers()
    }

    void join()
    return () => {
      cancelled = true
    }
  }, [clinicId, date, loadPeers, selfPeerId, upsertSelf, userId])

  useEffect(() => {
    if (!clinicId || !userId || !selfPeerId || pcLabel == null) return
    const prev = prevPublishRef.current
    const delay = calendarPeerPublishDelayMs(publish, prev)
    prevPublishRef.current = publish
    const timer = window.setTimeout(() => {
      void upsertSelf(publish, pcLabel, selfPeerId)
    }, delay)
    return () => window.clearTimeout(timer)
  }, [clinicId, pcLabel, publish, selfPeerId, upsertSelf, userId])

  useEffect(() => {
    if (!clinicId || !userId || !selfPeerId || pcLabel == null) return
    const timer = window.setInterval(() => {
      const label = pcLabelRef.current
      if (label == null) return
      void upsertSelf(publishRef.current, label, selfPeerId)
    }, CALENDAR_PEER_HEARTBEAT_MS)
    return () => window.clearInterval(timer)
  }, [clinicId, pcLabel, selfPeerId, upsertSelf, userId])

  useEffect(() => {
    if (!clinicId) return
    const channel = supabase
      .channel(`clinic-calendar-peers:${clinicId}:${date}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clinic_calendar_peers',
          filter: `clinic_id=eq.${clinicId}`,
        },
        () => {
          void loadPeers()
        },
      )
      .subscribe()
    const poll = window.setInterval(() => {
      void loadPeers()
    }, CALENDAR_PEER_HEARTBEAT_MS)
    return () => {
      window.clearInterval(poll)
      void supabase.removeChannel(channel)
    }
  }, [clinicId, date, loadPeers])

  useEffect(() => {
    if (!clinicId || !selfPeerId) return
    const leave = () => {
      void supabase
        .from('clinic_calendar_peers')
        .delete()
        .eq('clinic_id', clinicId)
        .eq('scheduled_date', date)
        .eq('peer_id', selfPeerId)
    }
    window.addEventListener('pagehide', leave)
    return () => {
      window.removeEventListener('pagehide', leave)
    }
  }, [clinicId, date, selfPeerId])

  const others = useMemo(
    () => (selfPeerId ? otherCalendarPeers(peers, selfPeerId) : []),
    [peers, selfPeerId],
  )

  return {
    others,
    setGridDrag,
  }
}
