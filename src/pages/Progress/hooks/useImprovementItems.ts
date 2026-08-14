import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  isImprovementStatus,
  type ImprovementStatus,
} from '@/pages/Progress/improvementItemPolicy'
import type { ImprovementItemView } from '@/pages/Progress/improvementItemTypes'

function toPublicError(message: string, fallback: string): string {
  if (message.includes('権限がありません')) {
    return 'この操作は運営アカウントのみ行えます。'
  }
  if (message.includes('状態が不正')) {
    return '状態を選び直してください。'
  }
  const lower = message.toLowerCase()
  if (lower.includes('row-level security') || lower.includes('permission denied')) {
    return 'この操作を行う権限がありません。'
  }
  return fallback
}

function toView(
  row: {
    id: string
    status: string
    share_title: string
    share_summary: string | null
    page_path: string | null
    clinic_id: string | null
    github_issue_number: number | null
    github_issue_url: string | null
    product_update_id: string | null
    created_at: string
    clinics: { name: string } | { name: string }[] | null
  },
): ImprovementItemView | null {
  if (!isImprovementStatus(row.status)) return null
  const clinic = Array.isArray(row.clinics) ? row.clinics[0] : row.clinics
  return {
    id: row.id,
    status: row.status,
    title: row.share_title,
    summary: row.share_summary,
    pagePath: row.page_path,
    clinicId: row.clinic_id,
    clinicName: clinic?.name ?? null,
    githubIssueNumber: row.github_issue_number,
    githubIssueUrl: row.github_issue_url,
    productUpdateId: row.product_update_id,
    createdAt: row.created_at,
  }
}

export function useImprovementItems() {
  const [items, setItems] = useState<ImprovementItemView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: listError } = await supabase
      .from('improvement_items')
      .select(
        'id, status, share_title, share_summary, page_path, clinic_id, github_issue_number, github_issue_url, product_update_id, created_at, clinics(name)',
      )
      .order('created_at', { ascending: false })

    if (listError) {
      setItems([])
      setError('進捗の読み込みに失敗しました。時間をおいて再度お試しください。')
      setLoading(false)
      return
    }

    setItems((data ?? []).map(toView).filter((row): row is ImprovementItemView => row != null))
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const setStatus = useCallback(
    async (id: string, status: ImprovementStatus) => {
      setBusyId(id)
      const { error: rpcError } = await supabase.rpc('set_improvement_item_status', {
        p_id: id,
        p_status: status,
      })
      setBusyId(null)
      if (rpcError) {
        return { ok: false as const, message: toPublicError(rpcError.message, '状態の更新に失敗しました。') }
      }
      await refresh()
      return { ok: true as const }
    },
    [refresh],
  )

  return { items, loading, error, busyId, setStatus, refresh }
}
