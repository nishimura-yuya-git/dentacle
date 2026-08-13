import { SecurityTextLink } from '@/pages/Security/sections/SecuritySectionBlock'
import { SECURITY_FOOTER_LINKS } from '@/pages/Security/securityCopy'

export function SecurityDocFooter() {
  return (
    <nav
      className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-2 border-t-[1.5px] border-slate-200 pt-4"
      aria-label="関連ページ"
    >
      {SECURITY_FOOTER_LINKS.map((link) => (
        <span key={link.href} className="text-xs">
          <SecurityTextLink {...link} />
        </span>
      ))}
    </nav>
  )
}
