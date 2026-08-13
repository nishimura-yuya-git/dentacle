/** 全院共通で切替可能な Cursor SDK モデル（§6.14 手動切替） */

export const PLATFORM_CURSOR_MODEL_IDS = [
  'grok-4.5',
  'grok-4.6',
  'composer-2.5',
] as const

export type PlatformCursorModelId = (typeof PLATFORM_CURSOR_MODEL_IDS)[number]

export const DEFAULT_PLATFORM_CURSOR_MODEL_ID: PlatformCursorModelId =
  'grok-4.5'

export const PLATFORM_CURSOR_MODEL_OPTIONS: Array<{
  id: PlatformCursorModelId
  label: string
  description: string
  /** おすすめバッジを出すか */
  recommended?: boolean
}> = [
  {
    id: 'grok-4.5',
    label: 'Grok 4.5',
    description:
      '通常の自動提案向けベースモデル ・負荷と品質のバランスが取りやすい',
    recommended: true,
  },
  {
    id: 'grok-4.6',
    label: 'Grok 4.6',
    description:
      '4.5の後継。長い割付判断に向く ・参照単価は4.5より上がりやすい',
  },
  {
    id: 'composer-2.5',
    label: 'Composer 2.5',
    description:
      'より複雑な割付に向く中帯モデル ・トークン消費はやや増えやすい',
  },
]

export function isPlatformCursorModelId(
  value: unknown,
): value is PlatformCursorModelId {
  return (
    typeof value === 'string' &&
    (PLATFORM_CURSOR_MODEL_IDS as readonly string[]).includes(value)
  )
}

export function normalizePlatformCursorModelId(
  value: unknown,
): PlatformCursorModelId {
  return isPlatformCursorModelId(value)
    ? value
    : DEFAULT_PLATFORM_CURSOR_MODEL_ID
}

const GROK_PLATFORM_CURSOR_MODEL_ID_SET = new Set<string>([
  'grok-4.5',
  'grok-4.6',
])

export function isGrokPlatformCursorModelId(
  value: unknown,
): value is Extract<PlatformCursorModelId, 'grok-4.5' | 'grok-4.6'> {
  return typeof value === 'string' && GROK_PLATFORM_CURSOR_MODEL_ID_SET.has(value)
}

export const COMPOSER_PLATFORM_CURSOR_MODEL_ID = 'composer-2.5' as const

/** Grok 行の版セレクト。ラベルは「Grok」見出しと重複させない */
export const GROK_VERSION_SELECT_OPTIONS = PLATFORM_CURSOR_MODEL_OPTIONS.filter(
  (option) => isGrokPlatformCursorModelId(option.id),
).map((option) => ({
  value: option.id,
  label: option.recommended
    ? `${option.label.replace(/^Grok\s+/, '')}（おすすめ）`
    : option.label.replace(/^Grok\s+/, ''),
}))

export type GrokVersionId = Extract<PlatformCursorModelId, 'grok-4.5' | 'grok-4.6'>

export function grokVersionValue(modelId: PlatformCursorModelId): GrokVersionId {
  return isGrokPlatformCursorModelId(modelId) ? modelId : 'grok-4.5'
}

/** 離散スライダー用。4.5 が 0、4.6 が 1。3段階にはしない。 */
export function grokVersionStepIndex(modelId: PlatformCursorModelId): 0 | 1 {
  return grokVersionValue(modelId) === 'grok-4.6' ? 1 : 0
}

export function grokVersionFromStepIndex(index: number): GrokVersionId {
  return index >= 1 ? 'grok-4.6' : 'grok-4.5'
}

/** トラック上の位置 0〜1 を最寄りの版へスナップする。 */
export function grokVersionFromTrackRatio(ratio: number): GrokVersionId {
  const clamped = Math.min(1, Math.max(0, ratio))
  return grokVersionFromStepIndex(clamped < 0.5 ? 0 : 1)
}
