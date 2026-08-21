import { BrandLogo } from '@/components/layout/BrandLogo'

type Props = {
  /** MFA など縦が詰まるカードではロゴ下の余白を一段落とす */
  compact?: boolean
  align?: 'start' | 'center' | 'end'
}

const ALIGN_CLASS = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
} as const

/** 認証カード内先頭の公式ロゴ。カード外やカタカナ併記はしない。 */
export function AuthCardBrand({ compact = false, align = 'start' }: Props) {
  return (
    <div className={`flex ${ALIGN_CLASS[align]} ${compact ? 'mb-5' : 'mb-8'}`}>
      <BrandLogo size={compact ? 'authCompact' : 'auth'} />
    </div>
  )
}
