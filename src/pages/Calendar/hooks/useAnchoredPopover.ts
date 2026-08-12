import { useEffect, useLayoutEffect, useRef, useState } from 'react'

type Pos = { top: number; left: number }

type Options = {
  open: boolean
  onClose: () => void
  /** パネル想定幅（画面端はみ出し防止用） */
  panelWidth?: number
}

/**
 * Select / DatePicker など portal 先の UI。
 * パネル DOM 外でも「内側」として外側クリック判定から除外する。
 */
function isInsidePortaledOverlay(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  if (target.closest('[data-anchored-ignore-outside="true"]')) return true
  if (target.closest('[role="listbox"]')) return true
  return false
}

/** アイコン直下に固定表示するポップオーバー位置・外側クリック・ESC */
export function useAnchoredPopover({
  open,
  onClose,
  panelWidth = 320,
}: Options) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<Pos>({ top: 0, left: 0 })

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return
    const update = () => {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) return
      const width = Math.min(panelWidth, window.innerWidth - 16)
      let left = rect.left
      if (left + width > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - width - 8)
      }
      const top = rect.bottom + 6
      const maxTop = window.innerHeight - 24
      setPos({ top: Math.min(top, maxTop), left })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open, panelWidth])

  useEffect(() => {
    if (!open) return
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node
      if (buttonRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      if (isInsidePortaledOverlay(event.target)) return
      onClose()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Select メニューが開いているときは先にそちらを閉じる（親は閉じない）
        if (document.querySelector('[role="listbox"]')) return
        onClose()
      }
    }
    document.addEventListener('mousedown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return { buttonRef, panelRef, pos }
}
