import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CALENDAR_PEER_DRAG_THROTTLE_MS,
  calendarPeerBadgeText,
  calendarPeerPublishDelayMs,
  claimPcLabel,
  focusPeersForVisit,
  isCalendarPeerFresh,
  otherCalendarPeers,
  remoteGhostsForTeam,
  remoteHideVisitIds,
  shouldHideVisitForRemotePeers,
  toCalendarLivePublish,
  type CalendarLivePublish,
  type CalendarPeerView,
} from './calendarLivePeers.ts'

const here = dirname(fileURLToPath(import.meta.url))

const now = Date.parse('2026-08-16T07:00:00.000Z')

function peer(partial: Partial<CalendarPeerView> & Pick<CalendarPeerView, 'peerId' | 'pcLabel'>): CalendarPeerView {
  return {
    focusVisitId: null,
    drag: null,
    lastSeenAt: '2026-08-16T06:59:55.000Z',
    ...partial,
  }
}

describe('calendarLivePeers', () => {
  it('空いている最小番号を PC 番号にする', () => {
    assert.equal(claimPcLabel([]), 1)
    assert.equal(claimPcLabel([1, 3]), 2)
    assert.equal(claimPcLabel([1, 2, 3]), 4)
    assert.equal(calendarPeerBadgeText(2), 'PC2')
  })

  it('自分と古い心拍は表示しない', () => {
    const rows = [
      peer({ peerId: 'self', pcLabel: 1 }),
      peer({ peerId: 'other', pcLabel: 2 }),
      peer({
        peerId: 'stale',
        pcLabel: 3,
        lastSeenAt: '2026-08-16T06:59:00.000Z',
      }),
    ]
    const others = otherCalendarPeers(rows, 'self', now)
    assert.deepEqual(
      others.map((item) => item.pcLabel),
      [2],
    )
    assert.equal(isCalendarPeerFresh('2026-08-16T06:59:00.000Z', now), false)
  })

  it('掴んだ直後はゴーストなし、移動開始後だけゴースト', () => {
    const grabbing = toCalendarLivePublish({
      drag: {
        mode: 'move',
        visitId: 'v1',
        teamId: 't1',
        startTime: '10:00',
        endTime: '10:30',
        preview: false,
      },
      detailVisitId: null,
      createPreview: null,
    })
    assert.equal(grabbing.focusVisitId, 'v1')
    assert.equal(grabbing.drag, null)

    const moving = toCalendarLivePublish({
      drag: {
        mode: 'move',
        visitId: 'v1',
        teamId: 't2',
        startTime: '11:00',
        endTime: '11:30',
        preview: true,
      },
      detailVisitId: null,
      createPreview: null,
    })
    assert.equal(moving.drag?.teamId, 't2')
    assert.equal(moving.drag?.mode, 'move')
  })

  it('空き枠ドラッグは作成ゴーストにする', () => {
    const creating = toCalendarLivePublish({
      drag: {
        mode: 'create',
        visitId: null,
        teamId: 't1',
        startTime: '09:00',
        endTime: '09:30',
        preview: true,
      },
      detailVisitId: 'ignored',
      createPreview: null,
    })
    assert.equal(creating.focusVisitId, null)
    assert.equal(creating.drag?.mode, 'create')
  })

  it('号車ごとのゴーストと移動中の元枠非表示', () => {
    const peers = [
      peer({
        peerId: 'a',
        pcLabel: 2,
        focusVisitId: 'v1',
        drag: {
          mode: 'move',
          visitId: 'v1',
          teamId: 't1',
          startTime: '10:00',
          endTime: '10:30',
        },
      }),
    ]
    assert.equal(remoteGhostsForTeam(peers, 't1').length, 1)
    assert.equal(remoteGhostsForTeam(peers, 't2').length, 0)
    assert.deepEqual(remoteHideVisitIds(peers), ['v1'])
    assert.equal(focusPeersForVisit(peers, 'v1')[0]?.pcLabel, 2)
  })

  it('自分の peerId は大小文字が違っても除外する', () => {
    const rows = [peer({ peerId: 'SELF-PEER', pcLabel: 1 })]
    assert.equal(otherCalendarPeers(rows, 'self-peer', now).length, 0)
  })

  it('移動中は元位置の枠だけ隠し、保存後の同位置ではゴーストを出さない', () => {
    const moving = [
      peer({
        peerId: 'a',
        pcLabel: 2,
        drag: {
          mode: 'move',
          visitId: 'v1',
          teamId: 't2',
          startTime: '11:00',
          endTime: '11:30',
        },
      }),
    ]
    const visitOld = {
      id: 'v1',
      team_id: 't1',
      start_time: '10:00:00',
      end_time: '10:30:00',
    }
    const visitNew = {
      id: 'v1',
      team_id: 't2',
      start_time: '11:00:00',
      end_time: '11:30:00',
    }
    assert.equal(shouldHideVisitForRemotePeers(visitOld, moving), true)
    assert.equal(shouldHideVisitForRemotePeers(visitNew, moving), false)
    assert.equal(
      remoteGhostsForTeam(moving, 't2', { occupyingVisits: [visitOld] }).length,
      1,
    )
    assert.equal(
      remoteGhostsForTeam(moving, 't2', { occupyingVisits: [visitNew] }).length,
      0,
    )
  })

  it('同じ訪問を動かすゴーストは1つにまとめる', () => {
    const peers = [
      peer({
        peerId: 'a',
        pcLabel: 1,
        drag: {
          mode: 'move',
          visitId: 'v1',
          teamId: 't1',
          startTime: '10:00',
          endTime: '10:30',
        },
      }),
      peer({
        peerId: 'b',
        pcLabel: 1,
        drag: {
          mode: 'move',
          visitId: 'v1',
          teamId: 't1',
          startTime: '10:00',
          endTime: '10:30',
        },
      }),
    ]
    assert.equal(remoteGhostsForTeam(peers, 't1').length, 1)
  })

  it('ドラッグ終了の心拍は待たずに送る', () => {
    const dragging: CalendarLivePublish = {
      focusVisitId: 'v1',
      drag: {
        mode: 'move',
        visitId: 'v1',
        teamId: 't1',
        startTime: '10:00',
        endTime: '10:30',
      },
    }
    const idle: CalendarLivePublish = { focusVisitId: null, drag: null }
    assert.equal(calendarPeerPublishDelayMs(dragging, idle), CALENDAR_PEER_DRAG_THROTTLE_MS)
    assert.equal(calendarPeerPublishDelayMs(idle, dragging), 0)
  })

  it('丸アイコンは名前を出さない', () => {
    const badge = readFileSync(join(here, '../components/CalendarPeerBadge.tsx'), 'utf8')
    const bar = readFileSync(join(here, '../components/CalendarPeerPresenceBar.tsx'), 'utf8')
    assert.match(badge, /calendarPeerBadgeText/)
    assert.equal(badge.includes('display_name'), false)
    assert.equal(badge.includes('name_kanji'), false)
    assert.equal(bar.includes('display_name'), false)
    assert.match(badge, /rounded-full/)
  })
})
