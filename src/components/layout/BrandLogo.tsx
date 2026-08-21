import { env } from '@/config/env'

export const BRAND_LOGO_SRC = '/icon/logo.png'

const SIZE_CLASS = {
  nav: 'h-7 w-auto max-w-[148px] object-left',
  footer: 'h-8 w-auto max-w-[168px] object-left',
  auth: 'h-12 w-auto max-w-[220px] object-center',
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
      className={`object-contain ${SIZE_CLASS[size]} ${className}`.trim()}
    />
  )
}
