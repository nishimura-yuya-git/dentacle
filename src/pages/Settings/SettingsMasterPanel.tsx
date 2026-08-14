import type { ReactNode } from 'react'

type Props = {
  title: string
  count: number
  children: ReactNode
  footer?: ReactNode
  empty?: boolean
  emptyMessage?: string
}

const TH =
  'whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-xs font-bold text-slate-600'

/** 設定マスタ（白 article 内。見出しはタブで足りるので重ねない） */
export function SettingsMasterPanel({
  title,
  count,
  children,
  footer,
  empty = false,
  emptyMessage = 'まだデータがありません',
}: Props) {
  return (
    <section
      aria-label={title}
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
    >
      <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
        <p className="text-xs font-bold text-slate-400">{count}件</p>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-slate-200 bg-white">
        {empty ? (
          <div className="flex min-h-[8rem] items-center justify-center px-4 py-8">
            <p className="text-center text-sm text-slate-400">{emptyMessage}</p>
          </div>
        ) : (
          children
        )}
      </div>

      {footer ? (
        // pr-20 はご意見FAB（bottom-5 right-5 h-14）との重なり回避。FABは動かさない。
        <div className="mt-4 shrink-0 border-t border-slate-100 pt-4 pr-20">
          {footer}
        </div>
      ) : null}
    </section>
  )
}

export function SettingsTable({
  headers,
  children,
}: {
  headers: string[]
  children: ReactNode
}) {
  // border-collapse だと sticky が効かないブラウザがあるため separate を使う
  return (
    <table className="min-w-full w-full border-separate border-spacing-0">
      <thead className="sticky top-0 z-10 shadow-sm">
        <tr>
          {headers.map((header) => (
            <th key={header} className={TH}>
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  )
}

export const SETTINGS_TD =
  'border-b border-slate-100 px-3 py-2.5 align-middle text-sm text-slate-700'
