import { SecurityLayout } from '@/components/layout/SecurityLayout'
import { HELP_HEADING } from '@/pages/Help/helpCopy'
import { HelpFaqList } from '@/pages/Help/sections/HelpFaqList'

/** Nani ヘルプのFAQ面を借りる。枠は文書シェル。文言はデンタクル。 */
export function HelpPage() {
  return (
    <SecurityLayout surface="plain">
      <h1 className="sr-only">{HELP_HEADING}</h1>
      <HelpFaqList />
    </SecurityLayout>
  )
}
