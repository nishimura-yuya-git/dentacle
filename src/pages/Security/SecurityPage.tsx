import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { SecurityArticle } from '@/pages/Security/sections/SecurityArticle'
import { SECURITY_PAGE_TITLE } from '@/pages/Security/securityCopy'

/** ログイン後の安全性説明。Nani の骨格、文言はデンタクルの実仕様。 */
export function SecurityPage() {
  return (
    <DashboardLayout title={SECURITY_PAGE_TITLE} description="データの守り方">
      <SecurityArticle />
    </DashboardLayout>
  )
}
