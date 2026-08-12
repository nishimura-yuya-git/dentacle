import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import type { AppNavMenuItem } from '@/components/layout/navConfig'

type Props = {
  label: string
  menuItems: AppNavMenuItem[]
  active: boolean
  /** モバイル用のやや大きめタップ領域 */
  compact?: boolean
}

/** 上部ナビの「ラベル ▼」ドロップダウン（患者管理など）。メニューは portal（overflow クリップ回避） */
export function NavDropdown({ label, menuItems, active, compact = false }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const { pathname } = useLocation()
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({})

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return

    function place() {
      const trigger = triggerRef.current
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      const gap = 6
      setMenuStyle({
        position: 'fixed',
        top: rect.bottom + gap,
        left: Math.max(8, rect.left),
        zIndex: 80,
        minWidth: Math.max(rect.width, 168),
      })
    }

    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return
      }
      setOpen(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className={['relative shrink-0', open ? 'z-50' : ''].join(' ')}>
      <button
        ref={triggerRef}
        type="button"
        className={[
          'inline-flex items-center gap-1 whitespace-nowrap font-medium transition',
          compact
            ? 'rounded-md px-3 py-2 text-xs font-bold'
            : 'rounded-md px-3 py-1.5 text-sm',
          active || open
            ? compact
              ? 'bg-[#008C01] text-white'
              : 'bg-[#008C01]/12 font-bold text-[#008C01]'
            : compact
              ? 'bg-slate-100 text-slate-600'
              : 'text-slate-700 hover:bg-slate-100',
        ].join(' ')}
        aria-label={`${label}メニュー`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{label}</span>
        <span
          className={['text-[10px] leading-none transition', open ? 'rotate-180' : ''].join(' ')}
          aria-hidden
        >
          ▼
        </span>
      </button>

      {open
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              aria-label={label}
              style={menuStyle}
              className="rounded-2xl border border-slate-200 bg-white py-1 shadow-lg"
            >
              {menuItems.map((item) => {
                const selected =
                  pathname === item.to ||
                  (item.to !== '/patients' && pathname.startsWith(`${item.to}/`)) ||
                  (item.to === '/patients' &&
                    (pathname === '/patients' || pathname.startsWith('/patients/')))
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    role="menuitem"
                    className={[
                      'block px-4 py-2.5 text-sm font-medium transition',
                      selected
                        ? 'bg-[#008C01]/10 font-bold text-[#008C01]'
                        : 'text-slate-700 hover:bg-slate-50',
                    ].join(' ')}
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
