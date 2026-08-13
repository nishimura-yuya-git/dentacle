import { formatDurationMs, type JobUsageView } from '../utils/readJobUsage'

export type AiUsageJobRow = {
  id: string
  clinicId: string
  clinicName: string
  targetDate: string
  model: string
  createdAt: string
  usage: JobUsageView
}

type Props = {
  rows: AiUsageJobRow[]
  loading: boolean
  /** 文書 article 内。外枠カードを出さない */
  embedded?: boolean
}

const TH =
  'whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-xs font-bold text-slate-600'
const TD = 'border-b border-slate-100 px-3 py-3 align-top text-sm text-slate-700'

/** 1リクエスト単位の消費一覧（件数・精度は出さない） */
export function AiUsageJobsTable({ rows, loading, embedded = false }: Props) {
  const table = (
    <div
      className={
        embedded
          ? 'mt-4 max-h-[min(28rem,60vh)] overflow-auto rounded-2xl border border-slate-200 bg-white'
          : 'min-h-0 flex-1 overflow-auto rounded-2xl border border-slate-200 bg-white'
      }
    >
      {loading ? (
        <div className="flex min-h-[8rem] items-center justify-center">
          <p className="text-sm text-slate-500">読み込み中…</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex min-h-[8rem] items-center justify-center px-4">
          <p className="text-center text-sm text-slate-500">
            まだ Cursor SDK 経由のジョブがありません。カレンダーで自動提案を実行するとここに出ます。
          </p>
        </div>
      ) : (
        <table className="min-w-[880px] w-full border-separate border-spacing-0 text-left text-sm">
          <thead className="sticky top-0 z-10 shadow-sm">
            <tr>
              <th className={TH}>実行日時</th>
              <th className={TH}>クリニック</th>
              <th className={TH}>対象日</th>
              <th className={TH}>モデル</th>
              <th className={TH}>時間</th>
              <th className={TH}>トークン</th>
              <th className={TH}>課金</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.id}
                className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}
              >
                <td className={`${TD} whitespace-nowrap`}>
                  {new Date(row.createdAt).toLocaleString('ja-JP')}
                </td>
                <td className={`${TD} font-bold text-slate-800`}>
                  {row.clinicName}
                </td>
                <td className={TD}>{row.targetDate}</td>
                <td className={`${TD} text-xs text-slate-600`}>
                  <span className="font-bold text-slate-800">{row.model}</span>
                  {row.usage.runtime ? (
                    <span className="mt-0.5 block text-slate-400">
                      {row.usage.runtime}
                    </span>
                  ) : null}
                </td>
                <td className={TD}>{formatDurationMs(row.usage.durationMs)}</td>
                <td className={TD}>
                  {row.usage.totalTokens !== null
                    ? row.usage.totalTokens.toLocaleString('ja-JP')
                    : '—'}
                  {row.usage.inputTokens !== null &&
                  row.usage.outputTokens !== null ? (
                    <span className="mt-0.5 block text-[11px] text-slate-400">
                      in {row.usage.inputTokens.toLocaleString('ja-JP')} / out{' '}
                      {row.usage.outputTokens.toLocaleString('ja-JP')}
                    </span>
                  ) : null}
                </td>
                <td className={TD}>
                  <span className="font-bold">{row.usage.chargedYenLabel}</span>
                  {row.usage.estimateYenLabel ? (
                    <span className="mt-0.5 block text-[11px] text-amber-600">
                      {row.usage.estimateYenLabel}
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )

  if (embedded) return table

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-3 shrink-0">
        <h2 className="text-sm font-bold text-slate-900">リクエスト別の消費</h2>
        <p className="mt-1 text-xs font-medium text-slate-400">
          上の条件で絞った自動提案ジョブごとのトークン・時間・課金
        </p>
      </div>
      {table}
    </section>
  )
}
