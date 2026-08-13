import { SecurityArticle } from '@/pages/Security/sections/SecurityArticle'
import { SecurityLayout } from '@/components/layout/SecurityLayout'

/** Nani 安全性ページの面を模倣。文言はデンタクルの実仕様。 */
export function SecurityPage() {
  return (
    <SecurityLayout>
      <SecurityArticle />
    </SecurityLayout>
  )
}
