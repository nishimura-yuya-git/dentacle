import { PublishedItemActions } from '@/pages/Announcements/components/PublishedItemActions'
import { UpdateTimelineItem } from '@/pages/Announcements/components/UpdateTimelineItem'
import type { ProductUpdateMark } from '@/pages/Announcements/productUpdateMark'
import type { ProductUpdateView } from '@/pages/Announcements/productUpdateTypes'
import {
  formatReleaseChipEmptyCopy,
  formatReleaseSectionTitle,
} from '@/pages/Announcements/releaseChipDisplay'

/** 公開面。見本の更新情報タイムライン。斜線チップは使わない。 */
export function PublishedTimeline({
  items,
  loading,
  error,
  busyId,
  onSelectMark,
  onSaveCopy,
  onDelete,
}: {
  items: ProductUpdateView[]
  loading: boolean
  error: string | null
  busyId?: string | null
  onSelectMark?: (id: string, mark: ProductUpdateMark) => void
  onSaveCopy?: (id: string, input: { title: string; body: string }) => void
  onDelete?: (id: string) => void
}) {
  const canEdit = onSaveCopy != null && onDelete != null

  return (
    <section>
      <h2 className="text-lg font-bold text-slate-900 md:text-2xl">
        {formatReleaseSectionTitle('published')}
      </h2>
      <div className="mt-6">
        {loading ? (
          <p className="text-sm font-medium text-slate-500">お知らせを読み込んでいます…</p>
        ) : error ? (
          <p className="text-sm font-medium text-rose-600">{error}</p>
        ) : items.length === 0 ? (
          <p className="text-sm font-medium text-slate-500">{formatReleaseChipEmptyCopy('published')}</p>
        ) : (
          items.map((item, index) => (
            <UpdateTimelineItem
              key={item.id}
              item={item}
              showDashedLine={index < items.length - 1}
              dateValue={item.publishedAt ?? item.proposedAt}
              showDetailAction={canEdit}
              onSelectMark={
                onSelectMark ? (mark) => onSelectMark(item.id, mark) : undefined
              }
              footer={
                canEdit ? (
                  <PublishedItemActions
                    item={item}
                    busy={busyId === item.id}
                    locked={busyId != null}
                    onSave={(input) => onSaveCopy(item.id, input)}
                    onDelete={() => onDelete(item.id)}
                  />
                ) : null
              }
            />
          ))
        )}
      </div>
    </section>
  )
}
