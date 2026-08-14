import type { ProductUpdateKind } from '@/pages/Announcements/productUpdatePolicy'

/** 更新情報タイムライン左の目印。種類とは別。絵文字・禁止アイコンは使わない。 */
export const PRODUCT_UPDATE_MARKS = [
  'sparkle',
  'note',
  'calendar',
  'optimization',
  'solution',
  'gears',
] as const

export type ProductUpdateMark = (typeof PRODUCT_UPDATE_MARKS)[number]

/** 選択UIに出す目印。news に無い重複表示（設定）は出さない。 */
export const PRODUCT_UPDATE_MARK_PICKER_VALUES = [
  'sparkle',
  'note',
  'calendar',
  'optimization',
  'solution',
] as const

const MARK_LABEL: Record<ProductUpdateMark, string> = {
  sparkle: '月',
  note: 'リンク',
  calendar: 'ピン',
  optimization: 'フォルダ',
  solution: '火',
  gears: 'フォルダ',
}

const MARK_SRC: Record<ProductUpdateMark, string> = {
  sparkle: '/icon/news/3dicons-moon-dynamic-color.png',
  note: '/icon/news/3dicons-link-dynamic-color.png',
  calendar: '/icon/news/3dicons-pin-dynamic-color.png',
  optimization: '/icon/news/3dicons-folder-dynamic-color.png',
  solution: '/icon/news/3dicons-fire-dynamic-color.png',
  gears: '/icon/news/3dicons-folder-dynamic-color.png',
}

export function isProductUpdateMark(value: string | null | undefined): value is ProductUpdateMark {
  return value != null && (PRODUCT_UPDATE_MARKS as readonly string[]).includes(value)
}

export function defaultProductUpdateMark(kind: ProductUpdateKind): ProductUpdateMark {
  return kind === 'fix' ? 'note' : 'sparkle'
}

export function resolveProductUpdateMark(
  mark: string | null | undefined,
  kind: ProductUpdateKind,
): ProductUpdateMark {
  return isProductUpdateMark(mark) ? mark : defaultProductUpdateMark(kind)
}

export function formatProductUpdateMarkLabel(mark: ProductUpdateMark): string {
  return MARK_LABEL[mark]
}

export function productUpdateMarkSrc(mark: ProductUpdateMark): string {
  return MARK_SRC[mark]
}

export const PRODUCT_UPDATE_MARK_OPTIONS: Array<{ value: ProductUpdateMark; label: string }> =
  PRODUCT_UPDATE_MARK_PICKER_VALUES.map((value) => ({
    value,
    label: MARK_LABEL[value],
  }))
