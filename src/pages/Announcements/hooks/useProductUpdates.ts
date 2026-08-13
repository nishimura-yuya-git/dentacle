import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  PRODUCT_UPDATE_KINDS,
  PRODUCT_UPDATE_STATUSES,
  PRODUCT_UPDATE_SURFACES,
  assertProductUpdateCreatedAsProposal,
  type ProductUpdateKind,
  type ProductUpdateStatus,
  type ProductUpdateSurface,
} from '@/pages/Announcements/productUpdatePolicy'
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

function toView(row: ProductUpdateRow): ProductUpdateView | null {
  if (!isKind(row.kind) || !isStatus(row.status)) return null
  const surfaces = (row.surfaces ?? []).filter(isSurface)
  return {
    id: row.id,
    status: row.status,
    kind: row.kind,
    title: row.title,
    body: row.body,
    detailUrl: row.detail_url,
    surfaces,
    updateNumber: row.update_number,
    proposedAt: row.proposed_at,
    publishedAt: row.published_at,
  }
}

function toPublicError(message: string, fallback: string): string {
  if (message.includes('権限がありません')) {
    return 'この操作は運営アカウントのみ行えます。'
  }
  if (message.includes('提案中の更新だけ')) {
    return message
  }
  if (message.includes('見出しを入力')) {
    return '見出しを入力してください。'
  }
  const lower = message.toLowerCase()
  if (lower.includes('row-level security') || lower.includes('permission denied')) {
    return 'この操作を行う権限がありません。'
  }
  return fallback
}

export function useProductUpdates() {
  const [items, setItems] = useState<ProductUpdateView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [listResult, adminResult] = await Promise.all([
      supabase
        .from('product_updates')
        .select(
          'id, status, kind, title, body, detail_url, surfaces, update_number, proposed_at, published_at, proposed_by, reviewed_at, reviewed_by, created_at, updated_at',
        )
        .order('proposed_at', { ascending: false }),
      supabase.rpc('is_platform_admin'),
    ])

    setIsPlatformAdmin(Boolean(adminResult.data) && !adminResult.error)

    if (listResult.error) {
      setItems([])
      setError('お知らせの読み込みに失敗しました。時間をおいて再度お試しください。')
      setLoading(false)
      return
    }

    setItems((listResult.data ?? []).map(toView).filter((row): row is ProductUpdateView => row != null))
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const published = useMemo(
    () =>
      items
        .filter((item) => item.status === 'published')
        .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '')),
    [items],
  )

  const proposed = useMemo(
    () =>
      items
        .filter((item) => item.status === 'proposed')
        .sort((a, b) => b.proposedAt.localeCompare(a.proposedAt)),
    [items],
  )

  const propose = useCallback(
    async (input: {
      kind: ProductUpdateKind
      title: string
      body: string
      detailUrl: string
      surfaces: ProductUpdateSurface[]
    }) => {
      assertProductUpdateCreatedAsProposal({ status: 'proposed' })
      const { error: rpcError } = await supabase.rpc('propose_product_update', {
        p_kind: input.kind,
        p_title: input.title,
        p_body: input.body.trim() === '' ? undefined : input.body,
        p_detail_url: input.detailUrl.trim() === '' ? undefined : input.detailUrl,
        p_surfaces: input.surfaces,
      })
      if (rpcError) {
        return { ok: false as const, message: toPublicError(rpcError.message, '提案の保存に失敗しました。') }
      }
      await refresh()
      return { ok: true as const }
    },
    [refresh],
  )

  const publish = useCallback(
    async (id: string) => {
      setBusyId(id)
      const { error: rpcError } = await supabase.rpc('publish_product_update', { p_id: id })
      setBusyId(null)
      if (rpcError) {
        return { ok: false as const, message: toPublicError(rpcError.message, '公開に失敗しました。') }
      }
      await refresh()
      return { ok: true as const }
    },
    [refresh],
  )

  const reject = useCallback(
    async (id: string) => {
      setBusyId(id)
      const { error: rpcError } = await supabase.rpc('reject_product_update', { p_id: id })
      setBusyId(null)
      if (rpcError) {
        return { ok: false as const, message: toPublicError(rpcError.message, '判定の保存に失敗しました。') }
      }
      await refresh()
      return { ok: true as const }
    },
    [refresh],
  )

  return { published, proposed, loading, error, busyId, isPlatformAdmin, propose, publish, reject, refresh }
}
