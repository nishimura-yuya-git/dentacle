/**
 * カレンダー自動提案ジョブの入出力契約（エージェント向け・PII最小化）。
 * §6.12: 氏名・電話・詳細住所は載せない。距離はアプリ算出の行列で渡す（§6.16）。
 */

import type { CursorUsageRecord } from '../cursor/usageTypes.ts'
import type { DueStatus, VisitFrequency } from '../../src/utils/schedule/visitDueUrgency.ts'

export type ProposeAccuracySummary = {
  parsedCount: number
  acceptedCount: number
  hardDroppedCount: number
  warnCount: number
  dropRate: number
}

export type ProposeTeamSnapshot = {
  index: number
  id: string
  name: string
}

export type ProposePatientSnapshot = {
  patientId: string
  areaLabel: string | null
  facilityId: string | null
  /** 座標あり（施設緯度経度）。生住所は載せない */
  hasCoordinates: boolean
  latitude: number | null
  longitude: number | null
  preferredWeekdays: number[]
  durationMinutes: number
  requiresDoctor: boolean
  priority: number
  phoneConfirmationRequired: boolean
  visitFrequency: VisitFrequency
  lastVisitDate: string | null
  nextDueDate: string | null
  dueUrgencyDays: number | null
  dueStatus: DueStatus
}

export type ProposeJobSnapshot = {
  schemaVersion: 2
  clinicId: string
  targetDate: string
  introductionLane: 'startup' | 'existing'
  dayStart: string
  dayEnd: string
  maxSlots: number
  travelGapMinutes: number
  teams: ProposeTeamSnapshot[]
  patients: ProposePatientSnapshot[]
  /** patientId → patientId → 移動分。アプリ側 SSoT で算出 */
  travelMinutesMatrix: Record<string, Record<string, number>>
  /** 住所なし等で除外した件数（監視用） */
  excludedWithoutAddress: number
  /**
   * 当日の既存枠。同じ号車のこの時間は新規割付で上書きしない。
   * 未指定は空き（既存テスト互換）。
   */
  occupiedVisits?: OccupiedVisit[]
}

/** 当日の既存枠（自動提案の occupied / 空き枠埋めの existing）。PIIなし */
export type OccupiedVisit = {
  patientId: string
  start: string
  end: string
  teamIndex: number
}

/** 空き枠埋め用: 当日既存枠（隣接ルート判定用・PIIなし） */
export type GapFillExistingVisit = OccupiedVisit

/** 空き枠埋め候補患者（近接分付き） */
export type GapFillPatientSnapshot = ProposePatientSnapshot & {
  /**
   * 空き枠前後の既存訪問（アンカー）までの最短移動分。
   * アンカーが無い場合は null（期限・優先度で並べる）。
   */
  gapProximityMinutes: number | null
}

/**
 * 空き枠埋めジョブのスナップショット。
 * Propose と同型フィールドを持ち、window / existingVisits を追加する。
 */
export type GapFillJobSnapshot = Omit<ProposeJobSnapshot, 'patients'> & {
  mode: 'gap_fill'
  windowStart: string
  windowEnd: string
  preferredTeamIndex: number
  existingVisits: GapFillExistingVisit[]
  /** 近接算出の基準にした既存訪問の patientId */
  anchorPatientIds: string[]
  patients: GapFillPatientSnapshot[]
  userMessage: string
}

export type GapFillCandidate = ProposeSlotResult & {
  warnings: string[]
}

export type RunGapFillInput = {
  accessToken: string
  clinicId: string
  targetDate: string
  vehicleTeamIds: string[]
  teamId: string
  windowStart: string
  windowEnd: string
  userMessage?: string
}

export type RunGapFillSuccess = {
  ok: true
  candidates: GapFillCandidate[]
  runtime: 'local' | 'cloud'
  modelId: string
  durationMs: number | null
  usage: CursorUsageRecord
}

export type RunGapFillFailure = {
  ok: false
  error: string
  code?:
    | 'unauthorized'
    | 'forbidden'
    | 'bad_request'
    | 'empty'
    | 'agent'
    | 'parse'
    | 'validation'
    | 'rate_limited'
  retryAfterSec?: number
}

export type ProposeSlotResult = {
  patientId: string
  proposedStart: string
  proposedEnd: string
  /** teams 配列の index。未指定時は順回り */
  teamIndex?: number
  reason?: string
}

export type ProposeAgentResult = {
  slots: ProposeSlotResult[]
}

export type RunProposeInput = {
  accessToken: string
  clinicId: string
  targetDate: string
  vehicleTeamIds: string[]
}

export type RunProposeSuccess = {
  ok: true
  jobId: string
  generatedCount: number
  adoptedCount: number
  runtime: 'local' | 'cloud'
  modelId: string
  durationMs: number | null
  usage: CursorUsageRecord
  accuracy: ProposeAccuracySummary
}

export type RunProposeFailure = {
  ok: false
  error: string
  code?:
    | 'unauthorized'
    | 'forbidden'
    | 'bad_request'
    | 'empty'
    | 'agent'
    | 'parse'
    | 'validation'
    | 'apply'
    | 'rate_limited'
  retryAfterSec?: number
  accuracy?: ProposeAccuracySummary
}
