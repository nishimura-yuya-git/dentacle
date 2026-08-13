import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { SecurityArticle } from '@/pages/Security/sections/SecurityArticle'
import { SecurityDocShell } from '@/pages/Security/sections/SecurityDocShell'
import { SECURITY_PAGE_TITLE } from '@/pages/Security/securityCopy'

/** Nani 安全性ページの面を模倣。文言はデンタクルの実仕様。 */
export function SecurityPage() {
  return (
    <DashboardLayout title={SECURITY_PAGE_TITLE} hidePageHeading>
      <SecurityDocShell>
        <SecurityArticle />
      </SecurityDocShell>
    </DashboardLayout>
  )
}
