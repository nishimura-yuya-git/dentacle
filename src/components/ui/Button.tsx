import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'soft'
type ButtonSize = 'md' | 'lg'

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary:
    'bg-[#008C01] text-white shadow-sm hover:bg-[#007201] focus-visible:ring-[#008C01]/35 disabled:bg-slate-300',
  secondary:
    'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-300/50 disabled:text-slate-400',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-300/40',
  /** 見本の灰ピル（データ出力・新規患者登録など） */
  soft: 'bg-slate-100 text-slate-700 hover:bg-slate-200/90 focus-visible:ring-slate-300/50 disabled:bg-slate-50 disabled:text-slate-400',
}

const SIZE_CLASS: Record<ButtonSize, string> = {
  md: 'px-5 py-3 text-sm',
  lg: 'px-6 py-3.5 text-base',
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center font-bold transition',
        'focus-visible:outline-none focus-visible:ring-4',
        'disabled:cursor-not-allowed',
        variant === 'soft' ? 'rounded-full gap-2' : 'rounded-xl',
        VARIANT_CLASS[variant],
        SIZE_CLASS[size],
        className,
      ].join(' ')}
      {...rest}
    >
      {loading ? '処理中…' : children}
    </button>
  )
}
