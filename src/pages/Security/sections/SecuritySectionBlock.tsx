import { Link } from 'react-router-dom'
import type { SecurityLink, SecuritySection } from '@/pages/Security/securityCopy'

const LINK_CLASS =
  'inline-flex text-sm font-bold text-slate-800 underline decoration-dotted decoration-slate-400 underline-offset-4 transition hover:text-[#008C01]'

export function SecurityTextLink({ href, label, external }: SecurityLink) {
  if (external) {
    return (
      <a href={href} className={LINK_CLASS} target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    )
  }

  return (
    <Link to={href} className={LINK_CLASS}>
      {label}
    </Link>
  )
}

export function SecuritySectionBlock({ section }: { section: SecuritySection }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="mb-1 mt-10 border-b border-slate-200 pb-1.5 text-lg font-bold text-slate-900">
        {section.title}
      </h2>
      {section.paragraphs.map((paragraph) => (
        <p key={paragraph} className="text-sm font-medium leading-[1.7] text-slate-700">
          {paragraph}
        </p>
      ))}
      {section.note ? (
        <p className="mt-1 text-sm font-medium leading-[1.7] text-slate-600">{section.note}</p>
      ) : null}
      {section.links?.length ? (
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
          {section.links.map((link) => (
            <SecurityTextLink key={link.href} {...link} />
          ))}
        </p>
      ) : null}
    </section>
  )
}
