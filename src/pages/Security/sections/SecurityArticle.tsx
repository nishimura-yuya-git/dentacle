import { SecurityMark } from '@/pages/Security/components/SecurityMark'
import { SecurityDocFooter } from '@/pages/Security/sections/SecurityDocFooter'
import { SecuritySectionBlock } from '@/pages/Security/sections/SecuritySectionBlock'
import { SECURITY_HEADING, SECURITY_INTRO, SECURITY_SECTIONS } from '@/pages/Security/securityCopy'

export function SecurityArticle() {
  return (
    <>
      <SecurityMark />
      <h1 className="mt-[18px] text-center text-2xl font-bold text-slate-900">{SECURITY_HEADING}</h1>
      <p className="mt-6 leading-[1.7] text-slate-900">{SECURITY_INTRO}</p>
      {SECURITY_SECTIONS.map((section) => (
        <SecuritySectionBlock key={section.id} section={section} />
      ))}
      <SecurityDocFooter />
    </>
  )
}
