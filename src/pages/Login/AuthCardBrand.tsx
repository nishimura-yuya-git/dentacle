import { BrandLogo } from '@/components/layout/BrandLogo'

type Props = {
  /** MFA など縦が詰まるカードではロゴ下の余白を一段落とす */
  compact?: boolean
}

/** 認証カード内先頭・左側の公式ロゴ。カード外やカタカナ併記はしない。 */
export function AuthCardBrand({ compact = false }: Props) {
  return (
    <div className={`flex justify-start ${compact ? 'mb-5' : 'mb-8'}`}>
      <BrandLogo size="auth" />
    </div>
  )
}
