/**
 * 運営向けモデル参照単価（§6.14 カスケード）。
 * 実請求の正は Cursor 課金 / Agent.getUsage()。ここは画面の参照概算用。
 * 表示は円（1 USD = 160 円）。
 */

export type AiModelPricingRow = {
  modelId: string
  label: string
  cascadeBand: string
  /** USD / 1M input tokens（参照） */
  inputUsdPer1M: number
  /** USD / 1M output tokens（参照） */
  outputUsdPer1M: number
  note: string
}

/** 表示用為替（USD → 円）。実請求レートではない */
export const USD_TO_JPY = 160

export const AI_MODEL_PRICING_TABLE: AiModelPricingRow[] = [
  {
    modelId: 'grok-4.5',
    label: 'Grok 4.5',
    cascadeBand: '0〜50%',
    inputUsdPer1M: 1.25,
    outputUsdPer1M: 6.0,
    note: 'ベースモデル（§6.14）。単価は参照仮値',
  },
  {
    modelId: 'grok-4.6',
    label: 'Grok 4.6',
    cascadeBand: '手動切替',
    inputUsdPer1M: 2.0,
    outputUsdPer1M: 6.0,
    note: '運営切替用。カスケード未定義。単価は Cursor 公開の標準参照',
  },
  {
    modelId: 'composer-2.5',
    label: 'Composer 2.5',
    cascadeBand: '50%超〜99%',
    inputUsdPer1M: 2.5,
    outputUsdPer1M: 10.0,
    note: '中帯。単価は参照仮値',
  },
  {
    modelId: 'gpt-5.6-sol',
    label: 'GPT 5.6 Sol',
    cascadeBand: '100%',
    inputUsdPer1M: 5.0,
    outputUsdPer1M: 15.0,
    note: '最上位帯（other）。単価は参照仮値',
  },
]

export function findModelPricing(modelId: string): AiModelPricingRow | undefined {
  const normalized = modelId.replace(/^cursor-sdk:/, '')
  return AI_MODEL_PRICING_TABLE.find(
    (row) => row.modelId === normalized || normalized.includes(row.modelId),
  )
}

/** 参照単価での概算（USD）。課金未確定時の補助表示用 */
export function estimateUsdFromTokens(input: {
  modelId: string
  inputTokens: number
  outputTokens: number
}): number | null {
  const pricing = findModelPricing(input.modelId)
  if (!pricing) return null
  return (
    (input.inputTokens / 1_000_000) * pricing.inputUsdPer1M +
    (input.outputTokens / 1_000_000) * pricing.outputUsdPer1M
  )
}

export function usdToYen(usd: number): number {
  return Math.round(usd * USD_TO_JPY)
}

export function formatYen(yen: number): string {
  return `¥${yen.toLocaleString('ja-JP')}`
}

export function formatCentsAsYen(cents: number): string {
  return formatYen(usdToYen(cents / 100))
}
