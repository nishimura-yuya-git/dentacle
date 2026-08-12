import { loadCursorServerEnv } from '../cursor/env.ts'
import { runCursorAgentPrompt } from '../cursor/runAgent.ts'
import type { CursorUsageRecord } from '../cursor/usageTypes.ts'
import { applyProposeResult } from './applyProposeResult.ts'
import { buildLocalProposeSlots } from './buildLocalProposeSlots.ts'
import { buildProposePrompt } from './buildProposePrompt.ts'
import { buildProposeSnapshot } from './buildProposeSnapshot.ts'
import { createUserSupabaseClient } from './createUserClient.ts'
import { loadPlatformCursorModel } from './loadPlatformCursorModel.ts'
import { packProposeSlots } from './packProposeSlots.ts'
import { parseProposeResult } from './parseProposeResult.ts'
import { loadProposeEngine } from './proposeEngine.ts'
import {
  releaseProposeSlot,
  tryAcquireProposeSlot,
} from './proposeRateLimit.ts'
import {
  toPublicProposeError,
  toRateLimitedProposeError,
} from './publicErrors.ts'
import type {
  ProposeAgentResult,
  ProposeJobSnapshot,
  RunProposeFailure,
  RunProposeInput,
  RunProposeSuccess,
} from './types.ts'
import {
  shouldStopForAccuracy,
  validateProposeResult,
} from './validateProposeResult.ts'

const WRITE_ROLES = new Set(['owner', 'admin', 'coordinator'])

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function logProposeError(scope: string, err: unknown): void {
  console.error(
    `[runProposeJob:${scope}]`,
    err instanceof Error ? err.message : err,
  )
}

/**
 * カレンダー自動提案のオーケストレーション。
 * 1) JWT 2) スナップショット 3) Cursor SDK 4) パース 5) 精度ゲート 6) 仮予約書き戻し
 */
export async function runProposeJob(
  input: RunProposeInput,
): Promise<RunProposeSuccess | RunProposeFailure> {
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

  const rate = tryAcquireProposeSlot(input.clinicId)
  if (!rate.ok) {
    return {
      ok: false,
      code: 'rate_limited',
      error: toRateLimitedProposeError(rate.retryAfterSec, rate.reason),
      retryAfterSec: rate.retryAfterSec,
    }
  }

  try {
    return await runProposeJobInner(input)
  } finally {
    releaseProposeSlot(input.clinicId)
  }
}

async function runProposeJobInner(
  input: RunProposeInput,
): Promise<RunProposeSuccess | RunProposeFailure> {
  const supabase = createUserSupabaseClient(input.accessToken)
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(input.accessToken)

  if (userError || !user) {
    if (userError) logProposeError('auth', userError)
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
    logProposeError('membership', membershipError)
    return {
      ok: false,
      code: 'apply',
      error: toPublicProposeError('apply'),
    }
  }

  // platform_admins は UI 側でも提案可。DB 直確認
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

  let snapshot
  try {
    snapshot = await buildProposeSnapshot({
      supabase,
      clinicId: input.clinicId,
      targetDate: input.targetDate,
      vehicleTeamIds: input.vehicleTeamIds,
    })
  } catch (err) {
    logProposeError('snapshot', err)
    return {
      ok: false,
      code: 'empty',
      error: toPublicProposeError('empty'),
    }
  }

  const engine = loadProposeEngine()
  const startedAt = Date.now()

  let generation: {
    result: ProposeAgentResult
    modelId: string
    runtime: 'local' | 'cloud'
    durationMs: number | null
    usage: CursorUsageRecord
    parsedCount: number
  } | null = null

  // 既定は Cursor SDK（方針は proposePolicy = PROJECT_MEMORY 割付条項の実行時抽出）
  if (engine === 'cursor' || engine === 'auto') {
    const cursorGen = await runCursorProposeGeneration(snapshot, supabase)
    if (cursorGen.ok) {
      generation = cursorGen.generation
    } else if (engine === 'cursor') {
      return cursorGen.failure
    } else {
      logProposeError(
        'agent-fallback-local',
        cursorGen.failure.error,
      )
    }
  }

  if (!generation && (engine === 'local' || engine === 'auto')) {
    const localStarted = Date.now()
    const localSlots = buildLocalProposeSlots(snapshot)
    if (localSlots.length > 0) {
      generation = {
        result: { slots: localSlots },
        modelId: 'local-pack',
        runtime: 'local',
        durationMs: Date.now() - localStarted,
        usage: emptyUsage(Date.now() - localStarted),
        parsedCount: localSlots.length,
      }
    } else if (engine === 'local') {
      return {
        ok: false,
        code: 'empty',
        error: toPublicProposeError('empty', 'ローカル割付の提案が0件でした'),
      }
    }
  }

  if (!generation) {
    return {
      ok: false,
      code: 'empty',
      error: toPublicProposeError('empty', '割付対象の提案が0件でした'),
    }
  }

  const accuracy = validateProposeResult(generation.result, snapshot)
  const gate = shouldStopForAccuracy(accuracy)
  if (gate.stop) {
    return {
      ok: false,
      code: 'validation',
      error: toPublicProposeError(
        'validation',
        gate.reason ?? undefined,
      ),
      accuracy: {
        parsedCount: accuracy.parsedCount,
        acceptedCount: accuracy.acceptedCount,
        hardDroppedCount: accuracy.hardDroppedCount,
        warnCount: accuracy.warnCount,
        dropRate: accuracy.dropRate,
      },
    }
  }

  // 号車別ルートは維持し、各号車内だけ密に連続配置する（§6.8 / §6.48）
  const packedSlots = packProposeSlots(accuracy.acceptedSlots, snapshot)
  if (packedSlots.length === 0) {
    return {
      ok: false,
      code: 'empty',
      error: toPublicProposeError(
        'empty',
        '号車内の連続配置後、割付が0件になりました',
      ),
    }
  }
  const packedAccuracy = validateProposeResult(
    { slots: packedSlots },
    snapshot,
  )
  const packedGate = shouldStopForAccuracy(packedAccuracy)
  if (packedGate.stop) {
    return {
      ok: false,
      code: 'validation',
      error: toPublicProposeError(
        'validation',
        packedGate.reason ?? undefined,
      ),
      accuracy: {
        parsedCount: accuracy.parsedCount,
        acceptedCount: packedAccuracy.acceptedCount,
        hardDroppedCount: packedAccuracy.hardDroppedCount,
        warnCount: packedAccuracy.warnCount,
        dropRate: packedAccuracy.dropRate,
      },
    }
  }

  try {
    const applied = await applyProposeResult({
      supabase,
      userId: user.id,
      snapshot,
      result: { slots: packedAccuracy.acceptedSlots },
      modelId: generation.modelId,
      runtime: generation.runtime,
      agentDurationMs: generation.durationMs,
      usage: generation.usage,
      accuracy: packedAccuracy,
    })

    return {
      ok: true,
      jobId: applied.jobId,
      generatedCount: applied.generatedCount,
      adoptedCount: applied.adoptedCount,
      runtime: generation.runtime,
      modelId: generation.modelId,
      durationMs: generation.durationMs ?? Date.now() - startedAt,
      usage: generation.usage,
      accuracy: {
        parsedCount: generation.parsedCount,
        acceptedCount: packedAccuracy.acceptedCount,
        hardDroppedCount: packedAccuracy.hardDroppedCount,
        warnCount: packedAccuracy.warnCount,
        dropRate: packedAccuracy.dropRate,
      },
    }
  } catch (err) {
    logProposeError('apply', err)
    return {
      ok: false,
      code: 'apply',
      error: toPublicProposeError('apply'),
    }
  }
}

function emptyUsage(durationMs: number | null): CursorUsageRecord {
  return {
    agentId: null,
    runId: null,
    durationMs,
    tokenUsage: null,
    cost: null,
    costSettled: false,
  }
}

async function runCursorProposeGeneration(
  snapshot: ProposeJobSnapshot,
  supabase: ReturnType<typeof createUserSupabaseClient>,
): Promise<
  | {
      ok: true
      generation: {
        result: ProposeAgentResult
        modelId: string
        runtime: 'local' | 'cloud'
        durationMs: number | null
        usage: CursorUsageRecord
        parsedCount: number
      }
    }
  | { ok: false; failure: RunProposeFailure }
> {
  let cursorEnv
  try {
    cursorEnv = loadCursorServerEnv()
  } catch (err) {
    logProposeError('cursor-env', err)
    return {
      ok: false,
      failure: {
        ok: false,
        code: 'agent',
        error: toPublicProposeError('agent'),
      },
    }
  }

  const platformModelId = await loadPlatformCursorModel(supabase)
  cursorEnv = { ...cursorEnv, modelId: platformModelId }

  const agentOutcome = await runCursorAgentPrompt({
    prompt: buildProposePrompt(snapshot, { cwd: cursorEnv.localCwd }),
    env: cursorEnv,
  })

  if (!agentOutcome.ok) {
    logProposeError('agent', agentOutcome.message)
    return {
      ok: false,
      failure: {
        ok: false,
        code: 'agent',
        error: toPublicProposeError('agent'),
      },
    }
  }

  let parsed: ProposeAgentResult
  try {
    parsed = parseProposeResult(agentOutcome.resultText, snapshot)
  } catch (err) {
    logProposeError('parse', err)
    return {
      ok: false,
      failure: {
        ok: false,
        code: 'parse',
        error: toPublicProposeError('parse'),
      },
    }
  }

  if (parsed.slots.length === 0) {
    return {
      ok: false,
      failure: {
        ok: false,
        code: 'empty',
        error: toPublicProposeError('empty', '割付対象の提案が0件でした'),
      },
    }
  }

  return {
    ok: true,
    generation: {
      result: parsed,
      modelId: agentOutcome.modelId,
      runtime: agentOutcome.runtime,
      durationMs: agentOutcome.durationMs,
      usage: agentOutcome.usage,
      parsedCount: parsed.slots.length,
    },
  }
}
