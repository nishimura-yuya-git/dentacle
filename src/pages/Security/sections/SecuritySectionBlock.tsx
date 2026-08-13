import { Link } from 'react-router-dom'
import type { SecurityCallout, SecurityLink, SecuritySection } from '@/pages/Security/securityCopy'

const LINK_CLASS =
  'inline-flex underline decoration-dotted decoration-current/50 underline-offset-[3px] text-slate-900 transition-colors hover:text-[#008C01]'

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
      <p className="text-[11px] font-bold text-slate-500">{callout.title}</p>
      <p className="mt-1 text-sm leading-[1.7] text-slate-900">{callout.body}</p>
      <p className="mt-2">
        <SecurityTextLink {...callout.link} />
      </p>
    </div>
  )
}

export function SecuritySectionBlock({ section }: { section: SecuritySection }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="mb-1 mt-10 border-b border-slate-200 pb-1.5 text-lg font-bold text-slate-900">
        {section.title}
      </h2>
      {section.paragraphs.map((paragraph) => (
        <p key={paragraph} className="leading-[1.7] text-slate-900">
          {paragraph}
        </p>
      ))}
      {section.callout ? <SecurityCalloutBox callout={section.callout} /> : null}
      {section.links?.length ? (
        <div className="flex flex-col items-start gap-1">
          {section.linkGroupLabel ? (
            <p className="text-[11px] font-bold text-slate-500">{section.linkGroupLabel}</p>
          ) : null}
          <p className="flex flex-wrap gap-x-4 gap-y-2">
            {section.links.map((link) => (
              <SecurityTextLink key={link.href} {...link} />
            ))}
          </p>
        </div>
      ) : null}
    </section>
  )
}
