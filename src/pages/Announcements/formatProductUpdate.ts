import type {
  ProductUpdateKind,
  ProductUpdatePlatform,
  ProductUpdateStatus,
  ProductUpdateSurface,
} from '@/pages/Announcements/productUpdatePolicy'

const KIND_LABEL: Record<ProductUpdateKind, string> = {
  feature: '新機能',
  improve: '改善',
  fix: '修正',
}

const PLATFORM_LABEL: Record<ProductUpdatePlatform, string> = {
  web: 'Web',
  mac: 'Mac',
  windows: 'Windows',
}

const SURFACE_LABEL: Record<ProductUpdateSurface, string> = {
  all: '全体',
  calendar: 'カレンダー',
  patients: '患者管理',
  contacts: '電話確認',
  users: 'ユーザー管理',
  settings: '設定',
  import: 'CSV取込',
}

const STATUS_LABEL: Record<ProductUpdateStatus, string> = {
  proposed: 'リリース予定',
  published: '公開',
  rejected: '入れない',
}

export function formatProductUpdateKindLabel(kind: ProductUpdateKind): string {
  return KIND_LABEL[kind]
}

export function formatProductUpdateSurfaceLabel(surface: ProductUpdateSurface): string {
  return SURFACE_LABEL[surface]
}

export function formatProductUpdatePlatformLabel(platform: ProductUpdatePlatform): string {
  return PLATFORM_LABEL[platform]
}

export function formatProductUpdateStatusLabel(status: ProductUpdateStatus): string {
  return STATUS_LABEL[status]
}

/** Nani と同じ「2026年8月13日」。月日はゼロ埋めしない。 */
export function formatProductUpdateDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

/** 公開後だけ付く通し番号。表記は update #N。 */
export function formatProductUpdateNumber(updateNumber: number | null | undefined): string | null {
  if (updateNumber == null || updateNumber < 1) return null
  return `update #${updateNumber}`
}
