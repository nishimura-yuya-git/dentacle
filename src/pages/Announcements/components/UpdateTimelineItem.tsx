import type { ReactNode } from 'react'
import { KindMark } from '@/pages/Announcements/components/KindMark'
import {
  formatProductUpdateDate,
  formatProductUpdateKindLabel,
  formatProductUpdateNumber,
  formatProductUpdatePlatformLabel,
  formatProductUpdateSurfaceLabel,
} from '@/pages/Announcements/formatProductUpdate'
import type { ProductUpdateView } from '@/pages/Announcements/productUpdateTypes'

export function UpdateTimelineItem({
  item,
  showDashedLine,
  dateValue,
  footer,
}: {
  item: ProductUpdateView
  showDashedLine: boolean
  dateValue: string
  footer?: ReactNode
}) {
  const numberLabel = formatProductUpdateNumber(item.updateNumber)

  return (
    <article className="flex gap-3 sm:gap-3.5">
      <div className="flex w-7 shrink-0 flex-col items-center gap-2">
        <KindMark kind={item.kind} />
        {showDashedLine ? (
          <div className="w-0 flex-1 border-l border-dashed border-slate-300" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1 pb-10">
        <header className="flex h-7 flex-wrap items-center gap-2">
          <time dateTime={dateValue} className="text-sm tracking-wide text-slate-500">
            {formatProductUpdateDate(dateValue)}
          </time>
          {numberLabel ? (
            <span className="text-xs font-bold text-[#008C01]">{numberLabel}</span>
          ) : (
            <span className="text-xs font-bold text-amber-600">
              {formatProductUpdateKindLabel(item.kind)}・提案中
            </span>
          )}
        </header>
        <div className="mt-1.5 rounded-3xl border border-slate-100 bg-white p-5">
          <h2 className="text-base font-bold leading-relaxed text-slate-900">{item.title}</h2>
          {item.body ? (
            <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-slate-500">{item.body}</p>
          ) : null}
          {item.detailUrl ? (
            <a
              href={item.detailUrl}
              className="mt-1.5 inline-flex items-center gap-1 text-sm font-bold text-[#007201]"
              {...(item.detailUrl.startsWith('http')
                ? { target: '_blank', rel: 'noreferrer noopener' }
                : {})}
            >
              詳しく見る
              <span aria-hidden="true">→</span>
            </a>
          ) : null}
          <div className="mt-3.5 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-[13px] font-bold text-[#008C01]">
              {formatProductUpdatePlatformLabel(item.platform)}
            </span>
            {item.surfaces.map((surface) => (
              <span
                key={surface}
                className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-[13px] font-bold text-[#008C01]"
              >
                {formatProductUpdateSurfaceLabel(surface)}
              </span>
            ))}
          </div>
          {footer}
        </div>
      </div>
    </article>
  )
}
