import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { SecurityTextLink } from '@/pages/Security/sections/SecuritySectionBlock'
import { SecurityNetworkTable } from '@/pages/Security/sections/SecurityNetworkTable'
import {
  SECURITY_NETWORK_INTRO,
  SECURITY_NETWORK_NOTE,
  SECURITY_NETWORK_ROWS,
  SECURITY_NETWORK_TITLE,
} from '@/pages/Security/securityCopy'

/** 企業ネットワーク向けの許可ドメイン。ブラウザが直接話す先だけ載せる。 */
export function SecurityNetworkPage() {
  return (
    <DashboardLayout title={SECURITY_NETWORK_TITLE} description="企業IT担当者向け">
      <article className="mx-auto w-full max-w-3xl pb-16">
        <p className="text-sm font-medium leading-[1.7] text-slate-700">{SECURITY_NETWORK_INTRO}</p>
        <SecurityNetworkTable rows={SECURITY_NETWORK_ROWS} />
        <p className="mt-6 text-sm font-medium leading-[1.7] text-slate-600">
          {SECURITY_NETWORK_NOTE}
        </p>
        <p className="mt-8">
          <SecurityTextLink href="/security" label="安全性に戻る" />
        </p>
      </article>
    </DashboardLayout>
  )
}
