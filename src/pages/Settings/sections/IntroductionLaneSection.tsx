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

const laneButtonClass = (active: boolean) =>
  [
    'rounded-xl px-3 py-1.5 text-sm font-bold transition-colors',
    active ? 'bg-[#008C01]/10 text-[#008C01]' : 'text-slate-700 hover:bg-slate-50',
    'disabled:cursor-not-allowed disabled:opacity-50',
  ].join(' ')

/**
 * クリニックの導入タイプ（立ち上げ / 既存）。
 * 見出し右タブと同型のボタン切替＋選択中の説明1面。
 */
export function IntroductionLaneSection({
  lane,
  canEdit,
  saving,
  onChange,
}: Props) {
  const preset = PROPOSAL_LANE_PRESETS[lane]

  return (
    <section
      aria-label="導入タイプ"
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-medium text-slate-400">
          自動提案の件数・稼働帯の目安が変わります
          {!canEdit ? '（変更は管理者のみ）' : ''}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {saving ? (
            <p className="text-xs font-bold text-[#008C01]">保存中…</p>
          ) : null}
          <div className="flex flex-nowrap gap-1" role="group" aria-label="導入タイプ">
            {LANE_OPTIONS.map((option) => {
              const active = option.value === lane
              return (
                <button
                  key={option.value}
                  type="button"
                  className={laneButtonClass(active)}
                  aria-pressed={active}
                  disabled={!canEdit || saving}
                  onClick={() => {
                    if (option.value !== lane) onChange(option.value)
                  }}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="mt-8 min-h-0 flex-1 overflow-auto">
        <p className="text-lg font-bold text-slate-900">{preset.label}</p>
        <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-600">
          {preset.summary}
        </p>
        <dl className="mt-8 grid max-w-lg gap-6 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-bold text-slate-400">1日の最大件数</dt>
            <dd className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
              最大 {preset.maxSlots}件
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold text-slate-400">稼働帯の目安</dt>
            <dd className="mt-2 text-2xl font-bold tracking-tight tabular-nums text-slate-900">
              {preset.dayStart.slice(0, 5)} – {preset.dayEnd.slice(0, 5)}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  )
}
