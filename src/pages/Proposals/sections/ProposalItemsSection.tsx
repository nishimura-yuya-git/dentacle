import { Button } from '@/components/ui/Button'
import { ITEM_STATUS_LABEL, type JobItem } from '@/pages/Proposals/types'
import { formatTime } from '@/utils/dates'

type Props = {
  items: JobItem[]
  canPropose: boolean
  busy: boolean
  onAdopt: (item: JobItem) => void
  onReject: (item: JobItem) => void
}

const TH =
  'whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-xs font-bold text-slate-600'
const TD = 'border-b border-slate-100 px-3 py-3 align-middle text-sm text-slate-700'

/** 提案明細（表 + sticky 見出し） */
export function ProposalItemsSection({
  items,
  canPropose,
  busy,
  onAdopt,
  onReject,
}: Props) {
  return (
    <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-3 flex shrink-0 items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">提案内容</h2>
          <p className="mt-1 text-xs font-medium text-slate-400">
            選択中ジョブの割付案。採用で仮予約を作成します
          </p>
        </div>
        <p className="shrink-0 text-xs font-bold text-slate-500">{items.length}件</p>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-slate-200 bg-white">
        {items.length === 0 ? (
          <div className="flex min-h-[8rem] items-center justify-center px-4">
            <p className="text-center text-sm text-slate-400">
              明細がありません。最近のジョブから提案を選ぶか、条件設定で生成してください。
            </p>
          </div>
        ) : (
          <table className="min-w-[720px] w-full border-separate border-spacing-0 text-left text-sm">
            <thead className="sticky top-0 z-10 shadow-sm">
              <tr>
                <th className={TH}>#</th>
                <th className={TH}>患者</th>
                <th className={TH}>時間</th>
                <th className={TH}>エリア</th>
                <th className={TH}>状態</th>
                <th className={TH}>操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr
                  key={item.id}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}
                >
                  <td className={`${TD} whitespace-nowrap font-bold text-slate-500`}>
                    {item.sequence_no}
                  </td>
                  <td className={`${TD} font-bold text-slate-900`}>
                    {item.patients?.name_kanji ?? item.patient_id}
                    {item.reason ? (
                      <span className="mt-0.5 block text-[11px] font-medium text-slate-400">
                        {item.reason}
                      </span>
                    ) : null}
                  </td>
                  <td className={`${TD} whitespace-nowrap tabular-nums`}>
                    {formatTime(item.proposed_start)}〜{formatTime(item.proposed_end)}
                  </td>
                  <td className={`${TD} text-slate-600`}>
                    {item.patients?.area_label || '—'}
                  </td>
                  <td className={`${TD} whitespace-nowrap`}>
                    {ITEM_STATUS_LABEL[item.status] ?? item.status}
                  </td>
                  <td className={TD}>
                    {item.status === 'proposed' && canPropose ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          className="!rounded-lg !px-3 !py-1.5 text-xs"
                          loading={busy}
                          onClick={() => onAdopt(item)}
                        >
                          採用
                        </Button>
                        <Button
                          variant="secondary"
                          className="!rounded-lg !px-3 !py-1.5 text-xs"
                          loading={busy}
                          onClick={() => onReject(item)}
                        >
                          却下
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs font-medium text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
