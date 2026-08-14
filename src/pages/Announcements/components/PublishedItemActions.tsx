import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  canDeleteProductUpdate,
  canEditProductUpdateCopy,
} from '@/pages/Announcements/productUpdatePolicy'
import type { ProductUpdateView } from '@/pages/Announcements/productUpdateTypes'

export function PublishedItemActions({
  item,
  busy,
  locked,
  onSave,
  onDelete,
  onExpandChange,
}: {
  item: ProductUpdateView
  busy: boolean
  locked: boolean
  onSave: (input: { title: string; body: string }) => void
  onDelete: () => void
  onExpandChange?: (expanded: boolean) => void
}) {
  const [title, setTitle] = useState(item.title)
  const [body, setBody] = useState(item.body ?? '')
  const [titleError, setTitleError] = useState<string | undefined>()
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    setTitle(item.title)
    setBody(item.body ?? '')
    setTitleError(undefined)
    setEditing(false)
    setConfirmingDelete(false)
  }, [item.id, item.title, item.body])

  useEffect(() => {
    onExpandChange?.(editing || confirmingDelete)
  }, [editing, confirmingDelete, onExpandChange])

  function handleSave() {
    if (title.trim() === '') {
      setTitleError('見出しを入力してください。')
      return
    }
    setTitleError(undefined)
    onSave({ title, body })
  }

  if (!canEditProductUpdateCopy(item.status) && !canDeleteProductUpdate(item.status)) {
    return null
  }

  return (
    <div className="space-y-4">
      {editing && canEditProductUpdateCopy(item.status) ? (
        <>
          <Input
            label="見出し"
            name={`published-title-${item.id}`}
            value={title}
            error={titleError}
            maxLength={200}
            disabled={locked}
            onChange={(event) => setTitle(event.target.value)}
          />
          <div className="space-y-2">
            <label htmlFor={`published-body-${item.id}`} className="block text-sm font-bold text-slate-800">
              本文（任意）
            </label>
            <textarea
              id={`published-body-${item.id}`}
              value={body}
              maxLength={2000}
              rows={3}
              disabled={locked}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#008C01] focus:ring-4 focus:ring-[#008C01]/20 disabled:bg-slate-50"
              onChange={(event) => setBody(event.target.value)}
            />
          </div>
        </>
      ) : null}
      {confirmingDelete ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-rose-600">この更新情報を削除しますか。元に戻せません。</p>
          <Button
            variant="secondary"
            disabled={locked}
            className="w-full border-rose-200 text-rose-600 hover:bg-rose-50"
            onClick={onDelete}
          >
            削除する
          </Button>
        </div>
      ) : editing ? (
        <div className="flex gap-2">
          {canEditProductUpdateCopy(item.status) ? (
            <Button variant="secondary" disabled={locked} loading={busy} className="flex-1" onClick={handleSave}>
              保存する
            </Button>
          ) : null}
          {canDeleteProductUpdate(item.status) ? (
            <Button
              variant="secondary"
              disabled={locked}
              className="flex-1 border-rose-200 text-rose-600 hover:bg-rose-50"
              onClick={() => setConfirmingDelete(true)}
            >
              削除する
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {canEditProductUpdateCopy(item.status) ? (
            <Button variant="secondary" disabled={locked} onClick={() => setEditing(true)}>
              編集する
            </Button>
          ) : null}
          {canDeleteProductUpdate(item.status) ? (
            <Button
              variant="secondary"
              disabled={locked}
              className="border-rose-200 text-rose-600 hover:bg-rose-50"
              onClick={() => setConfirmingDelete(true)}
            >
              削除する
            </Button>
          ) : null}
        </div>
      )}
    </div>
  )
}
