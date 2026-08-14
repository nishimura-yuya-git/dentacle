import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toProductUpdatePublicError, toProductUpdateView } from '@/pages/Announcements/productUpdateMap'
import {
  assertProductUpdateCreatedAsProposal,
  type ProductUpdateKind,
  type ProductUpdatePlatform,
  type ProductUpdateSurface,
} from '@/pages/Announcements/productUpdatePolicy'
import type { ProductUpdateMark } from '@/pages/Announcements/productUpdateMark'
import type { ProductUpdateView } from '@/pages/Announcements/productUpdateTypes'

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
          'id, status, kind, title, body, detail_url, surfaces, platform, update_number, show_in_progress_badge, timeline_mark, proposed_at, published_at, proposed_by, reviewed_at, reviewed_by, created_at, updated_at',
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

    setItems(
      (listResult.data ?? [])
        .map(toProductUpdateView)
        .filter((row): row is ProductUpdateView => row != null),
    )
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
      platform: ProductUpdatePlatform
      timelineMark?: ProductUpdateMark
    }) => {
      assertProductUpdateCreatedAsProposal({ status: 'proposed' })
      const { data, error: rpcError } = await supabase.rpc('propose_product_update', {
        p_kind: input.kind,
        p_title: input.title,
        p_body: input.body.trim() === '' ? undefined : input.body,
        p_detail_url: input.detailUrl.trim() === '' ? undefined : input.detailUrl,
        p_surfaces: input.surfaces,
        p_platform: input.platform,
      })
      if (rpcError || typeof data !== 'string' || data === '') {
        return {
          ok: false as const,
          message: toProductUpdatePublicError(rpcError?.message ?? '', '提案の保存に失敗しました。'),
        }
      }
      if (input.timelineMark) {
        const markResult = await supabase.rpc('set_product_update_timeline_mark', {
          p_id: data,
          p_mark: input.timelineMark,
        })
        if (markResult.error) {
          return {
            ok: false as const,
            message: toProductUpdatePublicError(markResult.error.message, 'アイコンの保存に失敗しました。'),
          }
        }
      }
      await refresh()
      return { ok: true as const, id: data }
    },
    [refresh],
  )

  const publish = useCallback(
    async (id: string) => {
      setBusyId(id)
      const { error: rpcError } = await supabase.rpc('publish_product_update', { p_id: id })
      setBusyId(null)
      if (rpcError) {
        return {
          ok: false as const,
          message: toProductUpdatePublicError(rpcError.message, '公開に失敗しました。'),
        }
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
        return {
          ok: false as const,
          message: toProductUpdatePublicError(rpcError.message, '判定の保存に失敗しました。'),
        }
      }
      await refresh()
      return { ok: true as const }
    },
    [refresh],
  )

  const setInProgressBadge = useCallback(
    async (id: string, show: boolean) => {
      setBusyId(id)
      const { error: rpcError } = await supabase.rpc('set_product_update_in_progress_badge', {
        p_id: id,
        p_show: show,
      })
      setBusyId(null)
      if (rpcError) {
        return {
          ok: false as const,
          message: toProductUpdatePublicError(rpcError.message, '開発中表示の保存に失敗しました。'),
        }
      }
      await refresh()
      return { ok: true as const }
    },
    [refresh],
  )

  const setTimelineMark = useCallback(
    async (id: string, mark: ProductUpdateMark) => {
      setBusyId(id)
      const { error: rpcError } = await supabase.rpc('set_product_update_timeline_mark', {
        p_id: id,
        p_mark: mark,
      })
      setBusyId(null)
      if (rpcError) {
        return {
          ok: false as const,
          message: toProductUpdatePublicError(rpcError.message, 'アイコンの保存に失敗しました。'),
        }
      }
      await refresh()
      return { ok: true as const }
    },
    [refresh],
  )

  const updateCopy = useCallback(
    async (id: string, input: { title: string; body?: string }) => {
      setBusyId(id)
      const { error: rpcError } = await supabase.rpc('update_product_update_copy', {
        p_id: id,
        p_title: input.title,
        p_body: input.body,
      })
      setBusyId(null)
      if (rpcError) {
        return {
          ok: false as const,
          message: toProductUpdatePublicError(rpcError.message, '文言の保存に失敗しました。'),
        }
      }
      await refresh()
      return { ok: true as const }
    },
    [refresh],
  )

  const remove = useCallback(
    async (id: string) => {
      setBusyId(id)
      const { error: rpcError } = await supabase.rpc('delete_product_update', { p_id: id })
      setBusyId(null)
      if (rpcError) {
        return {
          ok: false as const,
          message: toProductUpdatePublicError(rpcError.message, '削除に失敗しました。'),
        }
      }
      await refresh()
      return { ok: true as const }
    },
    [refresh],
  )

  const proposeAndPublish = useCallback(
    async (input: {
      kind: ProductUpdateKind
      title: string
      body: string
      detailUrl: string
      surfaces: ProductUpdateSurface[]
      platform: ProductUpdatePlatform
      timelineMark?: ProductUpdateMark
    }) => {
      const proposed = await propose(input)
      if (!proposed.ok) return proposed
      const published = await publish(proposed.id)
      if (!published.ok) return published
      return { ok: true as const, id: proposed.id }
    },
    [propose, publish],
  )

  return {
    published,
    proposed,
    loading,
    error,
    busyId,
    isPlatformAdmin,
    propose,
    proposeAndPublish,
    publish,
    reject,
    setInProgressBadge,
    setTimelineMark,
    updateCopy,
    remove,
    refresh,
  }
}
