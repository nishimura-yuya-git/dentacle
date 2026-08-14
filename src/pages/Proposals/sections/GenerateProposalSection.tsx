import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ComposingOrb } from '@/components/ui/ComposingOrb'
import { DatePicker } from '@/components/ui/DatePicker'
import { Select } from '@/components/ui/Select'
import { ProposalsSectionHeading } from '@/pages/Proposals/sections/ProposalsArticle'
import type { Team } from '@/pages/Proposals/types'

type Props = {
  targetDate: string
  teamId: string
  teams: Team[]
  canPropose: boolean
  busy: boolean
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
  onTargetDateChange,
  onTeamIdChange,
  onGenerate,
}: Props) {
  const [detailOpen, setDetailOpen] = useState(false)

  return (
    <section>
      <ProposalsSectionHeading>条件設定</ProposalsSectionHeading>
      <p className="mt-2.5 leading-[1.7] text-slate-900">
        対象日とチームを指定して提案を生成します。訪問条件や優先ルールの画面指定はまだありません。
      </p>

      <div className="mt-6 grid max-w-2xl gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800">対象日</span>
            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600">
              必須
            </span>
          </div>
          <DatePicker value={targetDate} onChange={onTargetDateChange} required />
        </div>
        <Select
          label="チーム"
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
        className="mt-4 text-left text-sm font-bold text-[#008C01] hover:underline"
        onClick={() => setDetailOpen((value) => !value)}
      >
        {detailOpen
          ? '詳細条件（準備中）を閉じる'
          : '詳細条件（訪問条件・優先ルールなど・準備中）'}
      </button>
      {detailOpen ? (
        <div className="mt-3 max-w-2xl rounded-2xl border border-slate-200 px-4 py-3 text-sm leading-[1.7] text-slate-900">
          訪問条件・優先ルール・提案パターン・スタッフ絞り込みはまだ生成APIに接続していません。
          いまは設定の導入タイプと患者の訪問条件・住所を使って割付します。クリニック一般の主導線は診療カレンダーの「自動提案」です。
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
        {busy ? <ComposingOrb size={64} /> : null}
        <Button variant="secondary" disabled={!canPropose || busy} onClick={onGenerate}>
          同条件で再生成
        </Button>
        <Button disabled={!canPropose || busy} aria-busy={busy} onClick={onGenerate}>
          {busy ? '提案を作成しています' : '提案を生成'}
        </Button>
      </div>
    </section>
  )
}
