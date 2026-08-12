/**
 * Day0 仮提案アダプタ。
 * 本格ルート最適化は Cursor SDK（Cloud）が正（PROJECT_MEMORY §6.10 / §6.11）。
 * ここはデモ導入用の最小割付のみ。SDK 接続後はこの結果を置き換える。
 */

import {
  getProposalLanePreset,
  timeToSeconds,
  type IntroductionLane,
  type ProposalLanePreset,
} from './proposalLanePresets.ts'

export type ProposalPatient = {
  patientId: string
  name: string
  areaLabel: string | null
  facilityId: string | null
  preferredWeekdays: number[]
  durationMinutes: number
  requiresDoctor: boolean
  priority: number
}

export type ProposalSlot = {
  patientId: string
  sequenceNo: number
  proposedDate: string
  proposedStart: string
  proposedEnd: string
  reason: string
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  const hh = Math.floor(total / 60)
  const mm = total % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`
}

function toDate(date: string): Date {
  return new Date(`${date}T00:00:00`)
}

function sortPatients(
  patients: ProposalPatient[],
  weekday: number,
  preferMatchingWeekdayFirst: boolean
): ProposalPatient[] {
  return [...patients].sort((a, b) => {
    if (preferMatchingWeekdayFirst) {
      const aMatch =
        a.preferredWeekdays.length === 0 || a.preferredWeekdays.includes(weekday)
      const bMatch =
        b.preferredWeekdays.length === 0 || b.preferredWeekdays.includes(weekday)
      if (aMatch !== bMatch) return aMatch ? -1 : 1
    }
    const areaA = a.areaLabel ?? '未設定'
    const areaB = b.areaLabel ?? '未設定'
    if (areaA !== areaB) return areaA.localeCompare(areaB, 'ja')
    if (a.facilityId !== b.facilityId) {
      return (a.facilityId ?? '').localeCompare(b.facilityId ?? '')
    }
    return a.priority - b.priority
  })
}

export function buildDay0Proposal(input: {
  targetDate: string
  patients: ProposalPatient[]
  /** 導入レーン。未指定時は起動用プリセット相当の既定（立ち上げ） */
  lane?: IntroductionLane
  /** テスト用にプリセットを上書きしたい場合 */
  preset?: ProposalLanePreset
}): ProposalSlot[] {
  const preset = input.preset ?? getProposalLanePreset(input.lane ?? 'startup')
  const weekday = toDate(input.targetDate).getDay()
  const sorted = sortPatients(
    input.patients,
    weekday,
    preset.preferMatchingWeekdayFirst
  )

  let cursor = preset.dayStart
  const slots: ProposalSlot[] = []
  const dayEndSec = timeToSeconds(preset.dayEnd)

  for (const patient of sorted) {
    if (slots.length >= preset.maxSlots) break

    const prefersToday =
      patient.preferredWeekdays.length === 0 ||
      patient.preferredWeekdays.includes(weekday)
    const start = cursor
    const end = addMinutes(start, patient.durationMinutes)
    if (timeToSeconds(end) > dayEndSec) break

    slots.push({
      patientId: patient.patientId,
      sequenceNo: slots.length + 1,
      proposedDate: input.targetDate,
      proposedStart: start,
      proposedEnd: end,
      reason: prefersToday
        ? `エリア「${patient.areaLabel ?? '未設定'}」で連続配置（${preset.label}）`
        : `希望曜日外だが仮配置（エリア: ${patient.areaLabel ?? '未設定'} / ${preset.label}）`,
    })
    cursor = addMinutes(end, preset.travelGapMinutes)
  }

  return slots
}
