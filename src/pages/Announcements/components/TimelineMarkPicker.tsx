import { KindMark } from '@/pages/Announcements/components/KindMark'
import {
  PRODUCT_UPDATE_MARK_OPTIONS,
  type ProductUpdateMark,
} from '@/pages/Announcements/productUpdateMark'

/** 更新情報の左アイコン選択。禁止アイコンライブラリは使わない。 */
export function TimelineMarkPicker({
  value,
  disabled = false,
  onChange,
}: {
  value: ProductUpdateMark
  disabled?: boolean
  onChange: (mark: ProductUpdateMark) => void
}) {
  return (
    <fieldset>
      <legend className="text-sm font-bold text-slate-800">アイコン</legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {PRODUCT_UPDATE_MARK_OPTIONS.map((option) => {
          const selected = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              aria-label={option.label}
              title={option.label}
              className={[
                'flex h-11 w-11 items-center justify-center rounded-2xl border transition',
                selected
                  ? 'border-[#008C01] bg-white ring-2 ring-[#008C01]/15'
                  : 'border-slate-200 bg-white hover:border-slate-300',
                disabled ? 'cursor-not-allowed opacity-50' : '',
              ].join(' ')}
              onClick={() => onChange(option.value)}
            >
              <KindMark mark={option.value} />
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
