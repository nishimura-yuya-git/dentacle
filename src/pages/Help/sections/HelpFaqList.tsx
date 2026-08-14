import { useEffect, useState } from 'react'
import {
  initialOpenHelpFaqIds,
  nextHelpFaqHash,
  resolveHelpFaqHash,
  toggleHelpFaqItem,
} from '@/pages/Help/helpAccordionPolicy'
import { collectHelpFaqIds, HELP_SECTIONS } from '@/pages/Help/helpCopy'
import { HelpFaqSection } from '@/pages/Help/sections/HelpFaqSection'

const knownIds = collectHelpFaqIds(HELP_SECTIONS)

function currentHash(): string {
  return typeof window === 'undefined' ? '' : window.location.hash
}

function applyHash(nextHash: string) {
  const url = `${window.location.pathname}${window.location.search}${nextHash}`
  window.history.replaceState(null, '', url)
}

/** ヘルプ本文。ハッシュの id があればその項目を開く。 */
export function HelpFaqList() {
  const [openIds, setOpenIds] = useState(() => initialOpenHelpFaqIds(currentHash(), knownIds))

  useEffect(() => {
    function syncFromHash() {
      const id = resolveHelpFaqHash(window.location.hash, knownIds)
      if (!id) return
      setOpenIds((current) => (current.includes(id) ? current : [...current, id]))
      document.getElementById(id)?.scrollIntoView({ block: 'start' })
    }

    syncFromHash()
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [])

  function handleToggle(id: string) {
    setOpenIds((current) => {
      const next = toggleHelpFaqItem(current, id)
      applyHash(nextHelpFaqHash(next, id, window.location.hash))
      return next
    })
  }

  return (
    <div className="space-y-10">
      {HELP_SECTIONS.map((section) => (
        <HelpFaqSection
          key={section.id}
          section={section}
          openIds={openIds}
          onToggle={handleToggle}
        />
      ))}
    </div>
  )
}
