import { useId } from 'react'
import { Switch } from '@/components/ui/Switch'

type Props = {
  label: string
  description?: string
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
}

/** ラベル＋補足＋右端スイッチの設定行 */
export function PreferenceRow({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: Props) {
  const switchId = useId()

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={switchId} className="block text-sm font-bold text-slate-800">
          {label}
        </label>
        {description ? (
          <p className="mt-0.5 text-xs font-medium text-slate-400">{description}</p>
        ) : null}
      </div>
      <Switch id={switchId} checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  )
}
