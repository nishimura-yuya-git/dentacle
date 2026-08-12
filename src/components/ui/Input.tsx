import type { InputHTMLAttributes } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
}

export function Input({ label, error, id, className = '', ...rest }: Props) {
  const inputId = id ?? rest.name
  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="block text-sm font-bold text-slate-800">
        {label}
      </label>
      <input
        id={inputId}
        className={[
          'w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition',
          'focus:border-[#008C01] focus:ring-4 focus:ring-[#008C01]/20',
          error ? 'border-rose-300' : 'border-slate-200',
          className,
        ].join(' ')}
        {...rest}
      />
      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
    </div>
  )
}
