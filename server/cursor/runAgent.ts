import { Agent, CursorAgentError } from '@cursor/sdk'
import { loadCursorServerEnv, type CursorServerEnv } from './env.ts'
import { buildCursorRuntimeOptions } from './runtime.ts'
import {
  toCostSnapshot,
  toTokenUsageSnapshot,
  type CursorUsageRecord,
} from './usageTypes.ts'

export type CursorRunSuccess = {
  ok: true
  status: 'finished'
  runtime: CursorServerEnv['runtime']
  modelId: string
  resultText: string | null
  durationMs: number | null
  usage: CursorUsageRecord
}

export type CursorRunFailure = {
  ok: false
  kind: 'startup' | 'run'
  message: string
  retryable?: boolean
  runtime: CursorServerEnv['runtime']
  modelId: string
  status?: string
  usage?: CursorUsageRecord
}

export type CursorRunOutcome = CursorRunSuccess | CursorRunFailure

function emptyUsage(): CursorUsageRecord {
  return {
    agentId: null,
    runId: null,
    durationMs: null,
    tokenUsage: null,
    cost: null,
    costSettled: false,
  }
}

/**
 * ワンショット実行（create → send → wait → getUsage → dispose）。
 * トークンと課金をできるだけ取得してジョブに残す。
 */
export async function runCursorAgentPrompt(input: {
  prompt: string
  env?: CursorServerEnv
}): Promise<CursorRunOutcome> {
  const config = input.env ?? loadCursorServerEnv()
  const runtimeOptions = buildCursorRuntimeOptions(config)
  const usage = emptyUsage()

  try {
    const agent = await Agent.create({
      apiKey: config.apiKey,
      model: { id: config.modelId },
      ...runtimeOptions,
    })

    try {
      usage.agentId = agent.agentId ?? null
      const run = await agent.send(input.prompt)
      usage.runId = run.id ?? null
      const result = await run.wait()

      usage.durationMs =
        typeof result.durationMs === 'number' ? result.durationMs : null
      usage.tokenUsage = toTokenUsageSnapshot(result.usage)

      try {
        // 課金取得は結果返却を遅延させやすいため短時間で打ち切る
        const billed = await Promise.race([
          agent.getUsage(),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('getUsage timeout')), 2000)
          }),
        ])
        if (!usage.tokenUsage) {
          usage.tokenUsage = toTokenUsageSnapshot(billed.usage)
        }
        const cost = toCostSnapshot(billed.cost)
        if (cost) {
          usage.cost = cost
          usage.costSettled = true
        }
      } catch {
        // 課金未確定・タイムアウト・未対応ランタイムはトークンのみで続行
      }

      if (result.status !== 'finished') {
        return {
          ok: false,
          kind: 'run',
          message: `エージェント実行が ${result.status} で終了しました`,
          runtime: config.runtime,
          modelId: config.modelId,
          status: result.status,
          usage,
        }
      }

      return {
        ok: true,
        status: 'finished',
        runtime: config.runtime,
        modelId: config.modelId,
        resultText: typeof result.result === 'string' ? result.result : null,
        durationMs: usage.durationMs,
        usage,
      }
    } finally {
      await agent[Symbol.asyncDispose]()
    }
  } catch (err) {
    if (err instanceof CursorAgentError) {
      return {
        ok: false,
        kind: 'startup',
        message: err.message,
        retryable: err.isRetryable,
        runtime: config.runtime,
        modelId: config.modelId,
        usage,
      }
    }
    throw err
  }
}
