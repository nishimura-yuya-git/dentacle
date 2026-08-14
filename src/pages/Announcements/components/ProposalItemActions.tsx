import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PreferenceRow } from '@/components/ui/PreferenceRow'
import {
  canDeleteProductUpdate,
  canEditProductUpdateCopy,
  canSetInProgressBadge,
} from '@/pages/Announcements/productUpdatePolicy'
import type { ProductUpdateView } from '@/pages/Announcements/productUpdateTypes'

export function ProposalItemActions({
  item,
  locked,
  onToggleInProgressBadge,
  onSaveTitle,
  onDelete,
}: {
  item: ProductUpdateView
  locked: boolean
  onToggleInProgressBadge: (show: boolean) => void
  onSaveTitle: (title: string) => void
  onDelete: () => void
}) {
  const [title, setTitle] = useState(item.title)
  const [titleError, setTitleError] = useState<string | undefined>()
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    setTitle(item.title)
    setTitleError(undefined)
    setConfirmingDelete(false)
  }, [item.id, item.title])

  function handleSave() {
    if (title.trim() === '') {
      setTitleError('項目を入力してください。')
      return
    }
    setTitleError(undefined)
    onSaveTitle(title)
  }

  return (
    <div className="space-y-5">
      {canEditProductUpdateCopy(item.status) ? (
        <Input
          label="項目"
          name={`proposal-title-${item.id}`}
          value={title}
          error={titleError}
          maxLength={200}
          disabled={locked}
          onChange={(event) => setTitle(event.target.value)}
        />
      ) : null}
      {canSetInProgressBadge(item.status) ? (
        <PreferenceRow
          label="開発中"
          description="チップの右上に表示する"
          checked={item.showInProgressBadge}
          disabled={locked}
          onChange={onToggleInProgressBadge}
        />
      ) : null}
      {confirmingDelete ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-rose-600">この項目を削除しますか。元に戻せません。</p>
          <Button
            variant="secondary"
            disabled={locked}
            className="border-rose-200 text-rose-600 hover:bg-rose-50"
            onClick={onDelete}
          >
            削除する
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          {canEditProductUpdateCopy(item.status) ? (
            <Button variant="secondary" disabled={locked} className="flex-1" onClick={handleSave}>
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
      )}
    </div>
  )
}
