import { Select } from '@/components/ui/Select'
import {
  PROPOSAL_LANE_PRESETS,
  type IntroductionLane,
} from '@/utils/schedule/proposalLanePresets'

type Props = {
  lane: IntroductionLane
  canEdit: boolean
  saving: boolean
  onChange: (lane: IntroductionLane) => void
}

const LANE_OPTIONS: Array<{ value: IntroductionLane; label: string }> = [
  { value: 'startup', label: '立ち上げ' },
  { value: 'existing', label: '既存導入' },
]

/**
 * クリニックの導入タイプ（立ち上げ / 既存）。
 * 2枚カードではなく、右端Select＋選択中の説明1面で表示する。
 */
export function IntroductionLaneSection({
  lane,
  canEdit,
  saving,
  onChange,
}: Props) {
  const preset = PROPOSAL_LANE_PRESETS[lane]

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm md:p-6">
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-slate-900">導入タイプ</h2>
          <p className="mt-1 text-xs font-medium text-slate-400">
            自動提案の件数・稼働帯の目安が変わります
            {!canEdit ? '（変更は管理者のみ）' : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-end gap-2">
          {saving ? (
            <p className="pb-2 text-xs font-bold text-[#008C01]">保存中…</p>
          ) : null}
          <div className="w-[10.5rem]">
            <Select
              id="introduction-lane"
              label="タイプ"
              labelTone="muted"
              size="sm"
              disabled={!canEdit || saving}
              options={LANE_OPTIONS}
              value={lane}
              onChange={(event) =>
                onChange(event.target.value as IntroductionLane)
              }
            />
          </div>
        </div>
      </div>

      <div className="mt-5 min-h-0 flex-1 overflow-auto">
        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-5 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-bold text-slate-900">{preset.label}</p>
            <span className="rounded-full bg-[#008C01] px-2.5 py-0.5 text-[10px] font-bold text-white">
              選択中
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-600">
            {preset.summary}
          </p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 sm:max-w-lg">
            <div className="rounded-xl border border-slate-100 bg-white px-4 py-3">
              <dt className="text-[11px] font-bold text-slate-400">1日の最大件数</dt>
              <dd className="mt-1 text-sm font-bold text-slate-900">
                最大 {preset.maxSlots}件
              </dd>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white px-4 py-3">
              <dt className="text-[11px] font-bold text-slate-400">稼働帯の目安</dt>
              <dd className="mt-1 text-sm font-bold tabular-nums text-slate-900">
                {preset.dayStart.slice(0, 5)} – {preset.dayEnd.slice(0, 5)}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  )
}
