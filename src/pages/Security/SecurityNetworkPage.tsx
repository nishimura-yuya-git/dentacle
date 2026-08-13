import { SecurityTextLink } from '@/pages/Security/sections/SecuritySectionBlock'
import { SecurityLayout } from '@/pages/Security/sections/SecurityLayout'
import { SecurityNetworkTable } from '@/pages/Security/sections/SecurityNetworkTable'
import {
  SECURITY_NETWORK_INTRO,
  SECURITY_NETWORK_NOTE,
  SECURITY_NETWORK_ROWS,
  SECURITY_NETWORK_TITLE,
} from '@/pages/Security/securityCopy'

/** 企業ネットワーク向けの許可ドメイン。面は安全性ページと同じ。 */
export function SecurityNetworkPage() {
  return (
    <SecurityLayout>
      <h1 className="text-2xl font-bold text-slate-900">{SECURITY_NETWORK_TITLE}</h1>
      <p className="mt-6 leading-[1.7] text-slate-900">{SECURITY_NETWORK_INTRO}</p>
      <SecurityNetworkTable rows={SECURITY_NETWORK_ROWS} />
      <p className="mt-6 leading-[1.7] text-slate-600">{SECURITY_NETWORK_NOTE}</p>
      <p className="mt-8">
        <SecurityTextLink href="/security" label="安全性に戻る" />
      </p>
    </SecurityLayout>
  )
}
