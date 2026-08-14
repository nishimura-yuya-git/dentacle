import {
  VISIT_CELL_COLOR_OPTIONS,
  type VisitCellColor,
} from '@/utils/visitMenus/visitCellColor'

type Props = {
  value: VisitCellColor
  onChange: (next: VisitCellColor) => void
}

/** 訪問セルの5色。色だけで意味を持たせず、日本語ラベルを添える */
export function VisitCellColorField({ value, onChange }: Props) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-bold text-slate-800">セルの色</legend>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="セルの色">
        {VISIT_CELL_COLOR_OPTIONS.map((option) => {
          const selected = option.id === value
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={option.label}
              onClick={() => onChange(option.id)}
              className={[
                'flex min-w-[3.25rem] flex-col items-center gap-1 rounded-xl border px-2 py-2',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#008C01]/30',
                selected
                  ? 'border-slate-400 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300',
              ].join(' ')}
            >
              <span
                aria-hidden
                className={`h-6 w-6 rounded-md border ${option.swatchClass}`}
              />
              <span className="text-[11px] font-bold text-slate-700">{option.label}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
