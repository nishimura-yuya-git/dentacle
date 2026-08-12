import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { DatePicker } from '@/components/ui/DatePicker'
import { Select } from '@/components/ui/Select'
import { ProposalStepper } from '@/pages/Proposals/sections/ProposalStepper'
import type { Team } from '@/pages/Proposals/types'

type Props = {
  targetDate: string
  teamId: string
  teams: Team[]
  canPropose: boolean
  busy: boolean
  activeStep: number
  onTargetDateChange: (value: string) => void
  onTeamIdChange: (value: string) => void
  onGenerate: () => void
}

/**
 * 条件設定。生成に効くのは対象日・チームのみ。
 * 未接続の詳細条件は折りたたみで案内する。
 */
export function GenerateProposalSection({
  targetDate,
  teamId,
  teams,
  canPropose,
  busy,
  activeStep,
  onTargetDateChange,
  onTeamIdChange,
  onGenerate,
}: Props) {
  const [detailOpen, setDetailOpen] = useState(false)

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm md:p-6">
      <div className="shrink-0">
        <h2 className="text-sm font-bold text-slate-900">条件設定</h2>
        <p className="mt-1 text-xs font-medium text-slate-400">
          対象日とチームを指定して提案を生成します（運営向け）
        </p>
        <div className="mt-4">
          <ProposalStepper activeStep={activeStep} />
        </div>
      </div>

      <div className="mt-5 min-h-0 flex-1 space-y-4 overflow-auto">
        <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">対象日</span>
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600">
                必須
              </span>
            </div>
            <DatePicker value={targetDate} onChange={onTargetDateChange} required />
          </div>
          <Select
            label="チーム"
            labelTone="muted"
            size="sm"
            value={teamId}
            onChange={(event) => onTeamIdChange(event.target.value)}
            options={[
              { value: '', label: '指定なし（全チーム）' },
              ...teams.map((team) => ({ value: team.id, label: team.name })),
            ]}
          />
        </div>

        <button
          type="button"
          className="text-left text-xs font-bold text-[#008C01] hover:underline"
          onClick={() => setDetailOpen((value) => !value)}
        >
          {detailOpen
            ? '詳細条件（準備中）を閉じる'
            : '詳細条件（訪問条件・優先ルールなど・準備中）'}
        </button>
        {detailOpen ? (
          <div className="max-w-2xl rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium leading-relaxed text-slate-500">
            訪問条件・優先ルール・提案パターン・スタッフ絞り込みはまだ生成APIに接続していません。
            いまは設定の導入タイプと患者の訪問条件・住所を使って割付します。クリニック一般の主導線は診療カレンダーの「自動提案」です。
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-4">
        <Button
          variant="secondary"
          className="!rounded-xl"
          disabled={!canPropose || busy}
          onClick={onGenerate}
        >
          同条件で再生成
        </Button>
        <Button
          className="!rounded-xl !px-8"
          loading={busy}
          disabled={!canPropose}
          onClick={onGenerate}
        >
          提案を生成
        </Button>
      </div>
    </section>
  )
}
