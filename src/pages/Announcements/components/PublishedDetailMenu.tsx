import { cloneElement, isValidElement, useEffect, useRef, useState, type ReactNode } from 'react'

const EDIT_ICON_SRC = '/icon/edit.png'

/** 運営だけ。医院向けカードの見た目を崩さず、右上の編集アイコンから操作を出す。 */
export function PublishedDetailMenu({
  children,
  onOpenChange,
}: {
  children: ReactNode
  onOpenChange?: (open: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  function setMenuOpen(next: boolean) {
    setOpen(next)
    onOpenChange?.(next)
  }

  useEffect(() => {
    if (!open) {
      setExpanded(false)
      return
    }

    function handlePointerDown(event: MouseEvent) {
      const root = rootRef.current
      if (root && !root.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown, true)
    return () => document.removeEventListener('mousedown', handlePointerDown, true)
  }, [open])

  const panel = isValidElement<{ onExpandChange?: (next: boolean) => void }>(children)
    ? cloneElement(children, { onExpandChange: setExpanded })
    : children

  return (
    <div ref={rootRef} className={`absolute right-5 top-5 ${open ? 'z-40' : 'z-10'}`}>
      <button
        type="button"
        aria-label="編集"
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 transition hover:bg-slate-200/80"
        onClick={() => setMenuOpen(!open)}
      >
        <img src={EDIT_ICON_SRC} alt="" width={22} height={22} className="h-[22px] w-[22px] object-contain" />
      </button>
      {open ? (
        <div
          className={[
            'absolute right-0 top-11 rounded-2xl border border-slate-100 bg-white shadow-[0_12px_28px_rgba(15,23,42,0.10)]',
            expanded ? 'w-80 p-4' : 'w-44 p-3',
          ].join(' ')}
        >
          {panel}
        </div>
      ) : null}
    </div>
  )
}
