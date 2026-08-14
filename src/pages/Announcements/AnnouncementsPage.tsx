import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useProductUpdates } from '@/pages/Announcements/hooks/useProductUpdates'
import {
  formatProductUpdateCreateCopy,
  formatProductUpdateTitleFieldCopy,
  isTitleOnlyProductUpdateCreate,
  shouldPublishAfterPropose,
  type ProductUpdateCreateDestination,
} from '@/pages/Announcements/productUpdateCreate'
import type { ProductUpdateMark } from '@/pages/Announcements/productUpdateMark'
import type {
  ProductUpdateKind,
  ProductUpdatePlatform,
  ProductUpdateSurface,
} from '@/pages/Announcements/productUpdatePolicy'
import { ANNOUNCEMENT_HEADER_ACTION_CLASS } from '@/pages/Announcements/releaseChipDisplay'
import { ProposalQueueSection } from '@/pages/Announcements/sections/ProposalQueueSection'
import { ProposeUpdateModal } from '@/pages/Announcements/sections/ProposeUpdateModal'
import { PublishedTimeline } from '@/pages/Announcements/sections/PublishedTimeline'

/**
 * お知らせの正本画面。院ユーザーには公開済みだけ見せる。
 * 運営はリリース予定とリリース済みの登録ができる。公開は提案のあとに入れる。
 */
export function AnnouncementsPage() {
  const toast = useToast()
  const {
    published,
    proposed,
    loading,
    error,
    busyId,
    isPlatformAdmin,
    propose,
    proposeAndPublish,
    setInProgressBadge,
    setTimelineMark,
    updateCopy,
    remove,
  } = useProductUpdates()
  const [createIntent, setCreateIntent] = useState<ProductUpdateCreateDestination | null>(null)
  const [creating, setCreating] = useState(false)
  const createCopy = createIntent ? formatProductUpdateCreateCopy(createIntent) : null
  const titleFieldCopy = createIntent ? formatProductUpdateTitleFieldCopy(createIntent) : null

  async function handleCreate(draft: {
    kind: ProductUpdateKind
    title: string
    body: string
    detailUrl: string
    surfaces: ProductUpdateSurface[]
    platform: ProductUpdatePlatform
    showInProgressBadge: boolean
    timelineMark: ProductUpdateMark
  }) {
    if (createIntent == null || createCopy == null) return false
    setCreating(true)
    const result = shouldPublishAfterPropose(createIntent)
      ? await proposeAndPublish(draft)
      : await propose(draft)
    if (
      result.ok &&
      createIntent === 'upcoming' &&
      !draft.showInProgressBadge &&
      'id' in result
    ) {
      const badgeResult = await setInProgressBadge(result.id, false)
      if (!badgeResult.ok) {
        setCreating(false)
        toast.error(badgeResult.message)
        return false
      }
    }
    setCreating(false)
    if (!result.ok) {
      toast.error(result.message)
      return false
    }
    toast.success(createCopy.successMessage)
    return true
  }

  async function handleToggleInProgressBadge(id: string, show: boolean) {
    const result = await setInProgressBadge(id, show)
    if (!result.ok) {
      toast.error(result.message)
    }
  }

  async function handleSelectTimelineMark(id: string, mark: ProductUpdateMark) {
    const result = await setTimelineMark(id, mark)
    if (!result.ok) {
      toast.error(result.message)
    }
  }

  async function handleSaveCopy(id: string, input: { title: string; body?: string }) {
    const result = await updateCopy(id, input)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    toast.success('保存しました。')
  }

  async function handleDelete(id: string) {
    const result = await remove(id)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    toast.success('削除しました。')
  }

  return (
    <DashboardLayout
      title="お知らせ"
      description="公開された更新内容"
      actions={
        isPlatformAdmin ? (
          <>
            <Button
              variant="secondary"
              className={ANNOUNCEMENT_HEADER_ACTION_CLASS}
              onClick={() => setCreateIntent('upcoming')}
            >
              {formatProductUpdateCreateCopy('upcoming').title}
            </Button>
            <Button
              variant="secondary"
              className={ANNOUNCEMENT_HEADER_ACTION_CLASS}
              onClick={() => setCreateIntent('published')}
            >
              {formatProductUpdateCreateCopy('published').title}
            </Button>
          </>
        ) : null
      }
    >
      <div className="mx-auto w-full max-w-3xl space-y-10">
        {isPlatformAdmin ? (
          <ProposalQueueSection
            items={proposed}
            busyId={busyId}
            onToggleInProgressBadge={(id, show) => void handleToggleInProgressBadge(id, show)}
            onSaveTitle={(id, title) => void handleSaveCopy(id, { title })}
            onDelete={(id) => void handleDelete(id)}
          />
        ) : null}

        <PublishedTimeline
          items={published}
          loading={loading}
          error={error}
          busyId={busyId}
          onSelectMark={
            isPlatformAdmin ? (id, mark) => void handleSelectTimelineMark(id, mark) : undefined
          }
          onSaveCopy={
            isPlatformAdmin
              ? (id, input) => void handleSaveCopy(id, input)
              : undefined
          }
          onDelete={isPlatformAdmin ? (id) => void handleDelete(id) : undefined}
        />
      </div>

      {isPlatformAdmin && createCopy && titleFieldCopy && createIntent ? (
        <ProposeUpdateModal
          open
          title={createCopy.title}
          submitLabel={createCopy.submitLabel}
          titleFieldLabel={titleFieldCopy.label}
          titleFieldError={titleFieldCopy.error}
          titleFieldPlaceholder={titleFieldCopy.placeholder}
          fields={isTitleOnlyProductUpdateCreate(createIntent) ? 'title-only' : 'full'}
          submitting={creating}
          onClose={() => setCreateIntent(null)}
          onSubmit={handleCreate}
        />
      ) : null}
    </DashboardLayout>
  )
}
