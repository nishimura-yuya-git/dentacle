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
