type Props = {
  id?: string
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  'aria-label'?: string
}

/** オン／オフのスイッチ。色は案件の主色とスレート */
export function Switch({
  id,
  checked,
  onChange,
  disabled = false,
  'aria-label': ariaLabel,
}: Props) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      className={[
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full',
        'transition-colors',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#008C01]/35',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-[#008C01]' : 'bg-slate-200',
      ].join(' ')}
      onClick={() => onChange(!checked)}
    >
      <span
        aria-hidden
        className={[
          'inline-block h-5 w-5 rounded-full bg-white shadow-sm',
          'transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1',
        ].join(' ')}
      />
    </button>
  )
}
