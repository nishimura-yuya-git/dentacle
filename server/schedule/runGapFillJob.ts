import { loadCursorServerEnv } from '../cursor/env.ts'
import { runCursorAgentPrompt } from '../cursor/runAgent.ts'
import { buildGapFillPrompt } from './buildGapFillPrompt.ts'
import { buildGapFillSnapshot } from './buildGapFillSnapshot.ts'
import { createUserSupabaseClient } from './createUserClient.ts'
import { loadPlatformCursorModel } from './loadPlatformCursorModel.ts'
import { parseGapFillResult } from './parseGapFillResult.ts'
import { buildGapFillCandidatesByProximity } from './rankGapFillByProximity.ts'
import {
  releaseProposeSlot,
  tryAcquireProposeSlot,
} from './proposeRateLimit.ts'
import {
  toPublicProposeError,
  toRateLimitedProposeError,
} from './publicErrors.ts'
import type {
  GapFillCandidate,
  GapFillJobSnapshot,
  RunGapFillFailure,
  RunGapFillInput,
  RunGapFillSuccess,
} from './types.ts'
import { validateProposeResult } from './validateProposeResult.ts'
import { timeToSeconds } from '../../src/utils/schedule/proposalLanePresets.ts'
import type { CursorUsageRecord } from '../cursor/usageTypes.ts'

const EMPTY_USAGE: CursorUsageRecord = {
  agentId: null,
  runId: null,
  durationMs: null,
  tokenUsage: null,
  cost: null,
  costSettled: false,
}

const WRITE_ROLES = new Set(['owner', 'admin', 'coordinator'])

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function isClock(value: string): boolean {
  return /^\d{1,2}:\d{2}(:\d{2})?$/.test(value.trim())
}

function logGapFillError(scope: string, err: unknown): void {
  console.error(
    `[runGapFillJob:${scope}]`,
    err instanceof Error ? err.message : err,
  )
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return timeToSeconds(aStart) < timeToSeconds(bEnd) && timeToSeconds(bStart) < timeToSeconds(aEnd)
}

/** 既存枠との同一号車重複を除外 */
function dropExistingOverlaps(
  candidates: GapFillCandidate[],
  existing: { start: string; end: string; teamIndex: number }[],
  preferredTeamIndex: number,
): GapFillCandidate[] {
  return candidates.filter((slot) => {
    const teamIndex =
      typeof slot.teamIndex === 'number' ? slot.teamIndex : preferredTeamIndex
    return !existing.some(
      (visit) =>
        visit.teamIndex === teamIndex &&
        overlaps(slot.proposedStart, slot.proposedEnd, visit.start, visit.end),
    )
  })
}

/**
 * 空き枠埋め: JWT → スナップショット → Cursor SDK → 候補返却（DB 書き込みなし）。
 */
export async function runGapFillJob(
  input: RunGapFillInput,
): Promise<RunGapFillSuccess | RunGapFillFailure> {
  if (!input.accessToken?.trim()) {
    return {
      ok: false,
      code: 'unauthorized',
      error: toPublicProposeError('unauthorized'),
    }
  }
  if (!input.clinicId?.trim()) {
    return {
      ok: false,
      code: 'bad_request',
      error: toPublicProposeError('bad_request', 'clinicId が必要です'),
    }
  }
  if (!isIsoDate(input.targetDate)) {
    return {
      ok: false,
      code: 'bad_request',
      error: toPublicProposeError(
        'bad_request',
        'targetDate は YYYY-MM-DD 形式です',
      ),
    }
  }
  if (!input.teamId?.trim()) {
    return {
      ok: false,
      code: 'bad_request',
      error: toPublicProposeError('bad_request', 'teamId が必要です'),
    }
  }
  if (!isClock(input.windowStart) || !isClock(input.windowEnd)) {
    return {
      ok: false,
      code: 'bad_request',
      error: toPublicProposeError(
        'bad_request',
        'windowStart / windowEnd は時刻形式です',
      ),
    }
  }

  const rateKey = `${input.clinicId}:gap-fill`
  const rate = tryAcquireProposeSlot(rateKey)
  if (!rate.ok) {
    return {
      ok: false,
      code: 'rate_limited',
      error: toRateLimitedProposeError(rate.retryAfterSec, rate.reason).replaceAll(
        '自動提案',
        '空き枠埋め',
      ),
      retryAfterSec: rate.retryAfterSec,
    }
  }

  try {
    return await runGapFillJobInner(input)
  } finally {
    releaseProposeSlot(rateKey)
  }
}

async function runGapFillJobInner(
  input: RunGapFillInput,
): Promise<RunGapFillSuccess | RunGapFillFailure> {
  const supabase = createUserSupabaseClient(input.accessToken)
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(input.accessToken)

  if (userError || !user) {
    if (userError) logGapFillError('auth', userError)
    return {
      ok: false,
      code: 'unauthorized',
      error: toPublicProposeError('unauthorized'),
    }
  }

  const { data: membership, error: membershipError } = await supabase
    .from('clinic_members')
    .select('role')
    .eq('clinic_id', input.clinicId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .is('deleted_at', null)
    .maybeSingle()

  if (membershipError) {
    logGapFillError('membership', membershipError)
    return {
      ok: false,
      code: 'forbidden',
      error: toPublicProposeError('forbidden'),
    }
  }

  let allowed = Boolean(membership && WRITE_ROLES.has(membership.role))
  if (!allowed) {
    const { data: platformAdmin } = await supabase
      .from('platform_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()
    allowed = Boolean(platformAdmin)
  }

  if (!allowed) {
    return {
      ok: false,
      code: 'forbidden',
      error: toPublicProposeError('forbidden'),
    }
  }

  let snapshot: GapFillJobSnapshot
  try {
    snapshot = await buildGapFillSnapshot({
      supabase,
      clinicId: input.clinicId,
      targetDate: input.targetDate,
      vehicleTeamIds: input.vehicleTeamIds,
      teamId: input.teamId,
      windowStart: input.windowStart,
      windowEnd: input.windowEnd,
      userMessage: input.userMessage ?? '',
    })
  } catch (err) {
    logGapFillError('snapshot', err)
    const detail = err instanceof Error ? err.message : ''
    const addressEmpty =
      detail.includes('住所') || detail.includes('住所なし除外')
    return {
      ok: false,
      code: 'empty',
      error: toPublicProposeError(
        'empty',
        addressEmpty
          ? '住所が登録された患者がいないため、近い候補を出せません。患者登録で住所を入れてから再度お試しください。'
          : 'この空き枠に入れられる候補患者がいません（当日すでに枠がある患者は対象外です）',
      ),
    }
  }

  /** 近接の正はアプリ側。エージェント空振りでも候補を返す */
  const proximityCandidates = dropExistingOverlaps(
    buildGapFillCandidatesByProximity(snapshot),
    snapshot.existingVisits,
    snapshot.preferredTeamIndex,
  )

  if (proximityCandidates.length === 0) {
    return {
      ok: false,
      code: 'empty',
      error: toPublicProposeError(
        'empty',
        'この空き枠に入れられる近い候補がいません（当日未割当の住所あり患者を確認してください）',
      ),
    }
  }

  let cursorEnv
  try {
    cursorEnv = loadCursorServerEnv()
  } catch (err) {
    logGapFillError('cursor-env', err)
    return {
      ok: true,
      candidates: proximityCandidates,
      runtime: 'local',
      modelId: 'proximity-local',
      durationMs: null,
      usage: EMPTY_USAGE,
    }
  }

  const platformModelId = await loadPlatformCursorModel(supabase)
  cursorEnv = { ...cursorEnv, modelId: platformModelId }

  const agentOutcome = await runCursorAgentPrompt({
    prompt: buildGapFillPrompt(snapshot),
    env: cursorEnv,
  })

  if (!agentOutcome.ok) {
    logGapFillError('agent', agentOutcome.message)
    return {
      ok: true,
      candidates: proximityCandidates,
      runtime: 'local',
      modelId: 'proximity-local',
      durationMs: null,
      usage: EMPTY_USAGE,
    }
  }

  let agentCandidates: GapFillCandidate[] = []
  try {
    const parsed = parseGapFillResult(agentOutcome.resultText, snapshot)
    const accuracy = validateProposeResult(
      { slots: parsed.candidates },
      snapshot,
    )
    agentCandidates = dropExistingOverlaps(
      parsed.candidates.filter((candidate) =>
        accuracy.acceptedSlots.some(
          (slot) => slot.patientId === candidate.patientId,
        ),
      ),
      snapshot.existingVisits,
      snapshot.preferredTeamIndex,
    )
  } catch (err) {
    logGapFillError('parse', err)
  }

  const candidates = mergeGapFillCandidates(
    proximityCandidates,
    agentCandidates,
  )

  return {
    ok: true,
    candidates,
    runtime: agentOutcome.runtime,
    modelId: agentOutcome.modelId,
    durationMs: agentOutcome.durationMs,
    usage: agentOutcome.usage,
  }
}

/**
 * 近接順を正とし、エージェントの reason / warnings があれば上書きする。
 */
function mergeGapFillCandidates(
  proximity: GapFillCandidate[],
  agent: GapFillCandidate[],
): GapFillCandidate[] {
  if (agent.length === 0) return proximity
  const byId = new Map(agent.map((row) => [row.patientId, row]))
  return proximity.map((row) => {
    const hit = byId.get(row.patientId)
    if (!hit) return row
    return {
      ...row,
      reason: hit.reason || row.reason,
      warnings: hit.warnings.length > 0 ? hit.warnings : row.warnings,
      proposedStart: hit.proposedStart || row.proposedStart,
      proposedEnd: hit.proposedEnd || row.proposedEnd,
      teamIndex: hit.teamIndex ?? row.teamIndex,
    }
  })
}
