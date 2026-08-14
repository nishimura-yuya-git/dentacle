import type { ReactNode } from 'react'

/** 見本の斜線カード。ページ枠は変えない。 */
export function ReleaseChipPanel({
  title,
  markSrc,
  action,
  children,
}: {
  title: string
  markSrc?: string | null
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="announcement-release-hatch rounded-[28px] border border-sky-100 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-800">
          {markSrc ? (
            <img src={markSrc} alt="" width={24} height={24} className="h-6 w-6 shrink-0" />
          ) : null}
          {title}
        </h2>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  )
}
