type Props = {
  id?: string
  label: string
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
}

/** 独自チェック。ネイティブ見た目は使わない。オンは主色。 */
export function Checkbox({
  id,
  label,
  checked,
  onChange,
  disabled = false,
}: Props) {
  return (
    <label
      className={[
        // sr-only の input は absolute。基準が body になると、
        // フォーカス時にスクロール領域ごと画面が飛ぶ
        'relative inline-flex items-center gap-2.5 text-sm font-bold text-slate-700',
        // 連打するとラベル文字が範囲選択されてしまうため選択させない
        'select-none',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
      ].join(' ')}
    >
      <input
        id={id}
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span
        aria-hidden
        className={[
          'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2',
          'transition-colors',
          'peer-focus-visible:ring-4 peer-focus-visible:ring-[#008C01]/35',
          checked
            ? 'border-[#008C01] bg-[#008C01] text-white'
            : 'border-slate-300 bg-white text-transparent',
        ].join(' ')}
      >
        <CheckGlyph />
      </span>
      {label}
    </label>
  )
}

function CheckGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M2.2 6.2 4.7 8.7 9.8 3.3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
