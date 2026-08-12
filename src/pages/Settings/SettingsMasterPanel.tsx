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

/** 設定マスタ用パネル（操作ログと同系の見出し・スクロール・下固定フォーム） */
export function SettingsMasterPanel({
  title,
  count,
  children,
  footer,
  empty = false,
  emptyMessage = 'まだデータがありません',
}: Props) {
  return (
    <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm md:p-5">
      <div className="mb-3 flex shrink-0 items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">{title}</h2>
          <p className="mt-0.5 text-[11px] font-medium text-slate-400">
            一覧を確認し、下のフォームから追加できます
          </p>
        </div>
        <p className="shrink-0 text-xs font-bold text-slate-500">{count}件</p>
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
        <div className="mt-3 shrink-0 border-t border-slate-100 pt-3">{footer}</div>
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
