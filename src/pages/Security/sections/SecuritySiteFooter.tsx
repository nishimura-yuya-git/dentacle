import { Link } from 'react-router-dom'
import { SECURITY_FOOTER_COLUMNS, SECURITY_TAGLINE } from '@/pages/Security/securityCopy'
import type { SecurityLink } from '@/pages/Security/securityCopy'

function FooterLink({ href, label, external }: SecurityLink) {
  const className = 'text-[15px] text-slate-500 transition-colors hover:text-slate-800'
  if (external) {
    return (
      <a href={href} className={className} target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    )
  }
  return (
    <Link to={href} className={className}>
      {label}
    </Link>
  )
}

/** 白パネルの外に置く関連リンク。Nani フッターの列構成を借りる。 */
export function SecuritySiteFooter() {
  return (
    <footer className="mt-16 pb-6 md:mt-20">
      <div className="flex flex-col justify-between gap-10 md:flex-row">
        <div className="min-w-36">
          <p className="text-sm font-bold text-[#008C01]">デンタクル</p>
          <p className="mt-4 text-[13px] leading-relaxed text-slate-400">{SECURITY_TAGLINE}</p>
        </div>
        <div className="flex flex-wrap items-start gap-9">
          {SECURITY_FOOTER_COLUMNS.map((column) => (
            <div key={column.title} className="min-w-36 flex-1">
              <p className="text-[13px] font-bold text-slate-400">{column.title}</p>
              <ul className="mt-3 flex flex-col gap-5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <FooterLink {...link} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </footer>
  )
}
