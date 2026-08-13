import { SecurityMark } from '@/pages/Security/components/SecurityMark'
import { SecuritySectionBlock } from '@/pages/Security/sections/SecuritySectionBlock'
import { SECURITY_HEADING, SECURITY_INTRO, SECURITY_SECTIONS } from '@/pages/Security/securityCopy'

export function SecurityArticle() {
  return (
    <article className="mx-auto w-full max-w-3xl pb-16">
      <SecurityMark />
      <p className="mt-5 text-center text-2xl font-bold text-slate-900">{SECURITY_HEADING}</p>
      <p className="mt-6 text-sm font-medium leading-[1.7] text-slate-700">{SECURITY_INTRO}</p>
      {SECURITY_SECTIONS.map((section) => (
        <SecuritySectionBlock key={section.id} section={section} />
      ))}
    </article>
  )
}
