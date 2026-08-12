type Variant = 'rect' | 'circle' | 'text'

type Props = {
  variant?: Variant
  className?: string
  width?: string | number
  height?: string | number
}

/**
 * 読込中プレースホルダ。実コンテンツの形に合わせて使う。
 */
export function Skeleton({
  variant = 'rect',
  className = '',
  width,
  height,
}: Props) {
  const style = {
    width: width ?? (variant === 'circle' ? undefined : '100%'),
    height:
      height ??
      (variant === 'text' ? 12 : variant === 'circle' ? undefined : 16),
  }

  return (
    <span
      aria-hidden="true"
      className={[
        'inline-block animate-pulse bg-slate-200/90',
        variant === 'circle' ? 'rounded-full' : 'rounded-md',
        variant === 'circle' ? 'h-4 w-4' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
    />
  )
}
