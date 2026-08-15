import { env } from '@/config/env'

export const BRAND_LOGO_SRC = '/icon/logo.png'

const SIZE_CLASS = {
  nav: 'h-7 w-auto max-w-[148px]',
  footer: 'h-8 w-auto max-w-[168px]',
} as const

type BrandLogoSize = keyof typeof SIZE_CLASS

/** 公式ロゴ。alt は Dentacle。カタカナ併記はしない。 */
export function BrandLogo({
  size = 'nav',
  className = '',
}: {
  size?: BrandLogoSize
  className?: string
}) {
  return (
    <img
      src={BRAND_LOGO_SRC}
      alt={env.appName}
      className={`object-contain object-left ${SIZE_CLASS[size]} ${className}`.trim()}
    />
  )
}
