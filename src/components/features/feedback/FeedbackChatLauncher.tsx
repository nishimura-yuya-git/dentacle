import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { FeedbackChatPanel } from '@/components/features/feedback/FeedbackChatPanel'

/** 右下のチャット起動。専用ページでは出さない */
export function FeedbackChatLauncher() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (pathname === '/feedback') return null

  return createPortal(
    <div className="pointer-events-none fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      {open ? (
        <div id={panelId} className="pointer-events-auto">
          <FeedbackChatPanel variant="float" onClose={() => setOpen(false)} />
        </div>
      ) : null}
      <button
        type="button"
        className="pointer-events-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#008C01] text-white shadow-sm transition hover:bg-[#007201] hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#008C01]/35"
        aria-label={open ? 'ご意見チャットを閉じる' : 'ご意見・不具合を送る'}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <CloseGlyph /> : <ChatGlyph />}
      </button>
    </div>,
    document.body,
  )
}

function ChatGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7A2.5 2.5 0 0 1 16.5 16H10l-4.2 3.2A.8.8 0 0 1 4.5 18.6V6.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M8 9h8M8 12.5h5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function CloseGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}
