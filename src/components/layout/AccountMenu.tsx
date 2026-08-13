import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { placeAccountMenu } from '@/components/layout/placeAccountMenu'

type Props = {
  onSignOut: () => void
  /** 単独表示時はピル全体の角丸を付ける */
  alone?: boolean
}

const MENU_LINKS = [
  { to: '/mypage', label: 'マイページ' },
  { to: '/announcements', label: 'お知らせ' },
  { to: '/security', label: '安全性' },
  { to: '/users', label: 'ユーザー管理（追加・編集・削除）' },
  { to: '/import', label: 'CSV取込' },
  { to: '/feedback', label: 'ご意見・不具合' },
  { to: '/account/contractor', label: '契約者情報' },
  { to: '/account/payments', label: 'お支払い履歴' },
  { to: '/account/contract', label: '契約情報' },
] as const

const MENU_WIDTH = 280
/** 下に足りるかの判定用。実測して位置を打ち直すとガクつくので見積もり固定 */
const ESTIMATED_MENU_HEIGHT = MENU_LINKS.length * 40 + 56

function sameMenuStyle(current: CSSProperties | null, next: CSSProperties): boolean {
  if (!current) return false
  return (
    current.top === next.top &&
    current.bottom === next.bottom &&
    current.left === next.left &&
    current.width === next.width &&
    current.maxHeight === next.maxHeight
  )
}

/** クリニック名の右▼。アカウント系メニューを開く */
export function AccountMenu({ onSignOut, alone = false }: Props) {
  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null)
      return
    }

    function place() {
      const trigger = triggerRef.current
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      const placed = placeAccountMenu({
        trigger: {
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        },
        menuWidth: MENU_WIDTH,
        menuHeight: ESTIMATED_MENU_HEIGHT,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      })
      const next: CSSProperties = {
        position: 'fixed',
        top: placed.top ?? undefined,
        bottom: placed.bottom ?? undefined,
        left: placed.left,
        width: placed.width,
        maxHeight: placed.maxHeight,
        zIndex: 80,
      }
      setMenuStyle((current) => (sameMenuStyle(current, next) ? current : next))
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
    <div ref={rootRef} className={open ? 'relative z-50' : 'relative'}>
      <button
        ref={triggerRef}
        type="button"
        className={[
          'flex h-full items-center justify-center px-2.5 text-slate-700 transition-colors hover:bg-slate-50',
          alone ? 'rounded-full' : 'rounded-r-full border-l border-slate-700',
        ].join(' ')}
        aria-label="アカウントメニュー"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
      >
        <ChevronIcon
          className={['transition-transform duration-150', open ? 'rotate-180' : ''].join(' ')}
        />
      </button>

      {open && menuStyle
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              aria-label="アカウントメニュー"
              style={menuStyle}
              className="overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white py-1 shadow-lg"
            >
              {MENU_LINKS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  role="menuitem"
                  className="block px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <div className="my-1 border-t border-slate-100" />
              <button
                type="button"
                role="menuitem"
                className="block w-full px-4 py-2.5 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
                onClick={() => {
                  setOpen(false)
                  onSignOut()
                }}
              >
                ログアウト
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

function ChevronIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
