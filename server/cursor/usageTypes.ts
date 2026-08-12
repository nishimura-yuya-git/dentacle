/** ジョブに保存するトークン・課金スナップショット（フロント表示と共有する形） */

export type CursorTokenUsageSnapshot = {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  totalTokens: number
  reasoningTokens?: number
}

export type CursorCostSnapshot = {
  rawCostCents: number
  chargedCents: number
}

export type CursorUsageRecord = {
  agentId: string | null
  runId: string | null
  durationMs: number | null
  /** ランタイムが返した累積トークン（無い場合 null） */
  tokenUsage: CursorTokenUsageSnapshot | null
  /** getUsage の課金。未確定時は null */
  cost: CursorCostSnapshot | null
  costSettled: boolean
}

export function toTokenUsageSnapshot(raw: unknown): CursorTokenUsageSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const row = raw as Record<string, unknown>
  const num = (key: string): number | null => {
    const value = row[key]
    return typeof value === 'number' && Number.isFinite(value) ? value : null
  }
  const inputTokens = num('inputTokens')
  const outputTokens = num('outputTokens')
  const cacheReadTokens = num('cacheReadTokens')
  const cacheWriteTokens = num('cacheWriteTokens')
  const totalTokens = num('totalTokens')
  if (
    inputTokens === null ||
    outputTokens === null ||
    cacheReadTokens === null ||
    cacheWriteTokens === null ||
    totalTokens === null
  ) {
    return null
  }
  const reasoningTokens = num('reasoningTokens')
  return {
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    totalTokens,
    ...(reasoningTokens === null ? {} : { reasoningTokens }),
  }
}

export function toCostSnapshot(raw: unknown): CursorCostSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const row = raw as Record<string, unknown>
  const rawCostCents = row.rawCostCents
  const chargedCents = row.chargedCents
  if (
    typeof rawCostCents !== 'number' ||
    !Number.isFinite(rawCostCents) ||
    typeof chargedCents !== 'number' ||
    !Number.isFinite(chargedCents)
  ) {
    return null
  }
  return { rawCostCents, chargedCents }
}
