import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { FeedbackChatPanel } from '@/components/features/feedback/FeedbackChatPanel'
import {
  isFeedbackIgnoreOutsideTarget,
  shouldCloseFeedbackOnOutsideClick,
} from '@/components/features/feedback/shouldCloseFeedbackOnOutsideClick'

/** 右下のチャット起動。専用ページでは出さない */
export function FeedbackChatLauncher() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent) {
      if (
        !shouldCloseFeedbackOnOutsideClick({
          containedByRoot: Boolean(rootRef.current?.contains(event.target as Node)),
          containedByIgnoreOutside: isFeedbackIgnoreOutsideTarget(event.target),
        })
      ) {
        return
      }
      setOpen(false)
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (pathname === '/feedback') return null

  return createPortal(
    <div
      ref={rootRef}
      className="pointer-events-none fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3"
    >
      {open ? (
        <div id={panelId} className="pointer-events-auto">
          <FeedbackChatPanel variant="float" onClose={() => setOpen(false)} />
        </div>
      ) : null}
      <button
        type="button"
        className="pointer-events-auto inline-flex h-14 w-14 items-center justify-center rounded-full border border-[#C5E5C5] bg-[#E7F4E7] text-[#008C01] shadow-sm transition-colors hover:bg-[#D5EDD5] hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#008C01]/35"
        aria-label={open ? 'ご意見チャットを閉じる' : 'ご意見・不具合を送る'}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <CloseGlyph /> : <ChatIcon />}
      </button>
    </div>,
    document.body,
  )
}

function ChatIcon() {
  return (
    <img
      src="/icon/chat.png"
      alt=""
      width={32}
      height={32}
      className="h-8 w-8 object-contain"
      draggable={false}
    />
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
