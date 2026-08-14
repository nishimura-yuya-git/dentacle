import { useState, type ReactNode } from 'react'
import { KindMark } from '@/pages/Announcements/components/KindMark'
import { PublishedDetailMenu } from '@/pages/Announcements/components/PublishedDetailMenu'
import { TimelineMarkPicker } from '@/pages/Announcements/components/TimelineMarkPicker'
import {
  formatProductUpdateDate,
  formatProductUpdateNumber,
  formatProductUpdatePlatformLabel,
  formatProductUpdateSurfaceLabel,
} from '@/pages/Announcements/formatProductUpdate'
import type { ProductUpdateMark } from '@/pages/Announcements/productUpdateMark'
import type { ProductUpdateView } from '@/pages/Announcements/productUpdateTypes'

/**
 * 公開面の1件。見本の縦タイムライン＋白カードを借りる。
 * 通し番号は update #N。バージョン番号の装飾は置かない。
 */
export function UpdateTimelineItem({
  item,
  showDashedLine,
  dateValue,
  footer,
  showDetailAction = false,
  onSelectMark,
}: {
  item: ProductUpdateView
  showDashedLine: boolean
  dateValue: string
  footer?: ReactNode
  showDetailAction?: boolean
  onSelectMark?: (mark: ProductUpdateMark) => void
}) {
  const [picking, setPicking] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const numberLabel = formatProductUpdateNumber(item.updateNumber)
  const surfaceBadges = item.surfaces.filter((surface) => surface !== 'all')

  return (
    <article className="flex gap-4">
      <div className="flex w-8 shrink-0 flex-col items-center">
        {onSelectMark ? (
          <button
            type="button"
            aria-label="アイコンを選ぶ"
            aria-expanded={picking}
            className="rounded-full transition hover:bg-slate-100"
            onClick={() => setPicking((current) => !current)}
          >
            <KindMark mark={item.timelineMark} />
          </button>
        ) : (
          <KindMark mark={item.timelineMark} />
        )}
        {showDashedLine ? (
          <div className="mt-1 w-0 flex-1 border-l border-dashed border-slate-300" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1 pb-12">
        <header className="flex min-h-8 flex-wrap items-center gap-3">
          <time dateTime={dateValue} className="text-sm text-slate-400">
            {formatProductUpdateDate(dateValue)}
          </time>
          {numberLabel ? (
            <span className="text-sm font-medium text-sky-400">{numberLabel}</span>
          ) : null}
        </header>
        <div
          className={`relative mt-3 rounded-[28px] bg-white px-6 py-6 shadow-[0_10px_28px_rgba(15,23,42,0.06)] ${
            menuOpen ? 'z-30' : ''
          }`}
        >
          {showDetailAction ? (
            <PublishedDetailMenu onOpenChange={setMenuOpen}>{footer}</PublishedDetailMenu>
          ) : null}
          {picking && onSelectMark ? (
            <div className="mb-5">
              <TimelineMarkPicker
                value={item.timelineMark}
                onChange={(mark) => {
                  onSelectMark(mark)
                  setPicking(false)
                }}
              />
            </div>
          ) : null}
          <h3
            className={`text-base font-bold leading-relaxed text-slate-900 ${
              showDetailAction ? 'pr-12' : ''
            }`}
          >
            {item.title}
          </h3>
          {item.body ? (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-500">
              {item.body}
            </p>
          ) : null}
          {item.detailUrl ? (
            <a
              href={item.detailUrl}
              className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-sky-500"
              {...(item.detailUrl.startsWith('http')
                ? { target: '_blank', rel: 'noreferrer noopener' }
                : {})}
            >
              詳しく見る
              <span aria-hidden="true">→</span>
            </a>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-500">
              {formatProductUpdatePlatformLabel(item.platform)}
            </span>
            {surfaceBadges.map((surface) => (
              <span
                key={surface}
                className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-500"
              >
                {formatProductUpdateSurfaceLabel(surface)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  )
}
