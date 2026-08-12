import {
  estimateUsdFromTokens,
  formatCentsAsYen,
  formatYen,
  usdToYen,
} from '@/config/aiModelPricing'

export type JobUsageView = {
  agentId: string | null
  runId: string | null
  durationMs: number | null
  inputTokens: number | null
  outputTokens: number | null
  totalTokens: number | null
  chargedYenLabel: string
  chargedCents: number | null
  estimateYen: number | null
  estimateYenLabel: string | null
  costSettled: boolean
  runtime: string | null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function readJobUsage(
  resultSnapshot: unknown,
  model: string | null,
): JobUsageView {
  const root = asRecord(resultSnapshot)
  const usage = asRecord(root?.usage)
  const tokenUsage = asRecord(usage?.tokenUsage)
  const cost = asRecord(usage?.cost)

  const inputTokens = asNumber(tokenUsage?.inputTokens)
  const outputTokens = asNumber(tokenUsage?.outputTokens)
  const totalTokens = asNumber(tokenUsage?.totalTokens)
  const chargedCents = asNumber(cost?.chargedCents)
  const costSettled = usage?.costSettled === true && chargedCents !== null

  let estimateYen: number | null = null
  let estimateYenLabel: string | null = null
  if (
    !costSettled &&
    inputTokens !== null &&
    outputTokens !== null &&
    model
  ) {
    const estimateUsd = estimateUsdFromTokens({
      modelId: model,
      inputTokens,
      outputTokens,
    })
    if (estimateUsd !== null) {
      estimateYen = usdToYen(estimateUsd)
      estimateYenLabel = `${formatYen(estimateYen)}（参照概算）`
    }
  }

  return {
    agentId: typeof usage?.agentId === 'string' ? usage.agentId : null,
    runId: typeof usage?.runId === 'string' ? usage.runId : null,
    durationMs:
      asNumber(usage?.durationMs) ?? asNumber(root?.agentDurationMs),
    inputTokens,
    outputTokens,
    totalTokens,
    chargedYenLabel: costSettled
      ? formatCentsAsYen(chargedCents!)
      : chargedCents !== null
        ? `${formatCentsAsYen(chargedCents)}（未確定）`
        : '—',
    chargedCents,
    estimateYen,
    estimateYenLabel,
    costSettled,
    runtime: typeof root?.runtime === 'string' ? root.runtime : null,
  }
}

export function formatDurationMs(ms: number | null): string {
  if (ms === null) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}秒`
}
