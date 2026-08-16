import { SecurityMark } from '@/pages/Security/components/SecurityMark'
import { SecuritySectionBlock } from '@/pages/Security/sections/SecuritySectionBlock'
import { SecurityLayout } from '@/components/layout/SecurityLayout'
import { PRIVACY_HEADING, PRIVACY_INTRO, PRIVACY_SECTIONS } from '@/pages/Security/privacyCopy'

/** 個人情報の取り扱い。枠は安全性と同じ文書シェル。 */
export function PrivacyPage() {
  return (
    <SecurityLayout>
      <SecurityMark />
      <h1 className="mt-[18px] text-center text-2xl font-bold text-slate-900">{PRIVACY_HEADING}</h1>
      <p className="mt-6 leading-[1.7] text-slate-900">{PRIVACY_INTRO}</p>
      {PRIVACY_SECTIONS.map((section) => (
        <SecuritySectionBlock key={section.id} section={section} />
      ))}
    </SecurityLayout>
  )
}
