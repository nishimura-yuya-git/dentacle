import {
  PRODUCT_UPDATE_KINDS,
  PRODUCT_UPDATE_PLATFORMS,
  PRODUCT_UPDATE_STATUSES,
  PRODUCT_UPDATE_SURFACES,
  type ProductUpdateKind,
  type ProductUpdatePlatform,
  type ProductUpdateStatus,
  type ProductUpdateSurface,
} from '@/pages/Announcements/productUpdatePolicy'
import { resolveProductUpdateMark } from '@/pages/Announcements/productUpdateMark'
import type { ProductUpdateRow, ProductUpdateView } from '@/pages/Announcements/productUpdateTypes'

function isKind(value: string): value is ProductUpdateKind {
  return (PRODUCT_UPDATE_KINDS as readonly string[]).includes(value)
}

function isStatus(value: string): value is ProductUpdateStatus {
  return (PRODUCT_UPDATE_STATUSES as readonly string[]).includes(value)
}

function isSurface(value: string): value is ProductUpdateSurface {
  return (PRODUCT_UPDATE_SURFACES as readonly string[]).includes(value)
}

function isPlatform(value: string): value is ProductUpdatePlatform {
  return (PRODUCT_UPDATE_PLATFORMS as readonly string[]).includes(value)
}

export function toProductUpdateView(row: ProductUpdateRow): ProductUpdateView | null {
  if (!isKind(row.kind) || !isStatus(row.status) || !isPlatform(row.platform)) return null
  const surfaces = (row.surfaces ?? []).filter(isSurface)
  return {
    id: row.id,
    status: row.status,
    kind: row.kind,
    title: row.title,
    body: row.body,
    detailUrl: row.detail_url,
    surfaces,
    platform: row.platform,
    updateNumber: row.update_number,
    showInProgressBadge: row.show_in_progress_badge !== false,
    timelineMark: resolveProductUpdateMark(row.timeline_mark, row.kind),
    proposedAt: row.proposed_at,
    publishedAt: row.published_at,
  }
}

export function toProductUpdatePublicError(message: string, fallback: string): string {
  if (message.includes('権限がありません')) {
    return 'この操作は運営アカウントのみ行えます。'
  }
  if (message.includes('提案中の更新だけ')) {
    return message
  }
  if (message.includes('開発中表示を変えられます')) {
    return '提案中の項目だけ、開発中の表示を変えられます。'
  }
  if (message.includes('アイコンを選んで')) {
    return 'アイコンを選んでください。'
  }
  if (message.includes('アイコンを変えられます')) {
    return 'この項目のアイコンは変えられません。'
  }
  if (message.includes('見出しを入力')) {
    return '見出しを入力してください。'
  }
  if (message.includes('対象環境を選んで')) {
    return '対象環境を選んでください。'
  }
  if (message.includes('進捗とつながっている')) {
    return '進捗とつながっている更新は削除できません。'
  }
  if (message.includes('編集できます') || message.includes('削除できません')) {
    return message
  }
  if (message.includes('has no field') && message.includes('version')) {
    return '保存に失敗しました。時間をおいて再度お試しください。'
  }
  const lower = message.toLowerCase()
  if (lower.includes('row-level security') || lower.includes('permission denied')) {
    return 'この操作を行う権限がありません。'
  }
  return fallback
}
