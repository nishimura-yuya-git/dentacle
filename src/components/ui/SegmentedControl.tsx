export type SegmentedOption<T extends string> = {
  value: T
  label: string
}

type Props<T extends string> = {
  options: ReadonlyArray<SegmentedOption<T>>
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  disabled?: boolean
  /** nav: 画面切替 / choice: 同じ画面内の2択 */
  tone?: 'nav' | 'choice'
}

const itemClass = (active: boolean) =>
  [
    'rounded-full px-3 py-1.5 text-sm font-bold transition-colors',
    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#008C01]/35',
    'disabled:cursor-not-allowed disabled:opacity-50',
    active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
  ].join(' ')

/** 灰トラックの上に、選中だけ白ピルが乗る切替 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  disabled = false,
  tone = 'choice',
}: Props<T>) {
  const buttons = options.map((option) => {
    const active = option.value === value
    return (
      <button
        key={option.value}
        type="button"
        className={itemClass(active)}
        aria-current={tone === 'nav' && active ? 'page' : undefined}
        aria-pressed={tone === 'choice' ? active : undefined}
        disabled={disabled}
        onClick={() => {
          if (option.value !== value) onChange(option.value)
        }}
      >
        {option.label}
      </button>
    )
  })

  const trackClass = 'inline-flex flex-nowrap rounded-full bg-slate-100 p-1'

  if (tone === 'nav') {
    return (
      <nav className={trackClass} aria-label={ariaLabel}>
        {buttons}
      </nav>
    )
  }

  return (
    <div className={trackClass} role="group" aria-label={ariaLabel}>
      {buttons}
    </div>
  )
}
