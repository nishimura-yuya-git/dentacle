import type { Tables } from '@/types/database.types'
import type {
  ProductUpdateKind,
  ProductUpdatePlatform,
  ProductUpdateStatus,
  ProductUpdateSurface,
} from '@/pages/Announcements/productUpdatePolicy'

export type ProductUpdateRow = Tables<'product_updates'>

export type ProductUpdateView = {
  id: string
  status: ProductUpdateStatus
  kind: ProductUpdateKind
  title: string
  body: string | null
  detailUrl: string | null
  surfaces: ProductUpdateSurface[]
  platform: ProductUpdatePlatform
  updateNumber: number | null
  proposedAt: string
  publishedAt: string | null
}

export const KIND_OPTIONS: Array<{ value: ProductUpdateKind; label: string }> = [
  { value: 'feature', label: '新機能' },
  { value: 'improve', label: '改善' },
  { value: 'fix', label: '修正' },
]

export const PLATFORM_OPTIONS: Array<{ value: ProductUpdatePlatform; label: string }> = [
  { value: 'web', label: 'Web' },
  { value: 'mac', label: 'Mac' },
  { value: 'windows', label: 'Windows' },
]

export const SURFACE_OPTIONS: Array<{ value: ProductUpdateSurface; label: string }> = [
  { value: 'all', label: '全体' },
  { value: 'calendar', label: 'カレンダー' },
  { value: 'patients', label: '患者管理' },
  { value: 'contacts', label: '電話確認' },
  { value: 'users', label: 'ユーザー管理' },
  { value: 'settings', label: '設定' },
  { value: 'import', label: 'CSV取込' },
]
