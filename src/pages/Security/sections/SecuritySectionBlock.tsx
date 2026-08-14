import { Link } from 'react-router-dom'
import type { SecurityCallout, SecurityLink, SecuritySection } from '@/pages/Security/securityCopy'

const LINK_CLASS =
  'inline-flex text-slate-600 underline decoration-dotted decoration-current/50 underline-offset-[3px] transition-colors hover:text-slate-900'

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

function SecurityCalloutBox({ callout }: { callout: SecurityCallout }) {
  return (
    <div className="-mx-1 mt-2 rounded-2xl border border-slate-200 px-4 py-3">
      <p className="text-[13px] font-bold text-slate-500">{callout.title}</p>
      <p className="mt-1 text-sm leading-[1.7] text-slate-900">{callout.body}</p>
      <p className="mt-2">
        <SecurityTextLink {...callout.link} />
      </p>
    </div>
  )
}

function SecurityLinkGroup({
  label,
  links,
}: {
  label?: string
  links: SecurityLink[]
}) {
  return (
    <div className="-mx-1 mt-2 rounded-2xl border border-slate-200 px-4 py-3">
      {label ? <p className="text-[13px] font-bold text-slate-500">{label}</p> : null}
      <p className={`${label ? 'mt-1' : ''} flex flex-wrap gap-x-4 gap-y-2`}>
        {links.map((link) => (
          <SecurityTextLink key={link.href} {...link} />
        ))}
      </p>
    </div>
  )
}

export function SecuritySectionBlock({ section }: { section: SecuritySection }) {
  return (
    <section id={section.id}>
      <h2 className="mb-1 mt-10 border-b border-slate-200 pb-1.5 text-lg font-bold text-slate-900">
        {section.title}
      </h2>
      {section.paragraphs.map((paragraph) => (
        <p key={paragraph} className="mt-2.5 leading-[1.7] text-slate-900">
          {paragraph}
        </p>
      ))}
      {section.callout ? <SecurityCalloutBox callout={section.callout} /> : null}
      {section.links?.length ? (
        <SecurityLinkGroup label={section.linkGroupLabel} links={section.links} />
      ) : null}
    </section>
  )
}
