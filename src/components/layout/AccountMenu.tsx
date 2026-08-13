import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

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

/** クリニック名の右▼。アカウント系メニューを開く */
export function AccountMenu({ onSignOut, alone = false }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
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
    <div ref={rootRef} className={['relative', open ? 'z-50' : ''].join(' ')}>
      <button
        type="button"
        className={[
          'flex h-full items-center justify-center px-2.5 text-slate-700 transition hover:bg-slate-50',
          alone ? 'rounded-full' : 'rounded-r-full border-l border-slate-700',
        ].join(' ')}
        aria-label="アカウントメニュー"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
      >
        <ChevronIcon className={['transition', open ? 'rotate-180' : ''].join(' ')} />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="アカウントメニュー"
          className="absolute right-0 top-full z-50 mt-2 w-[280px] rounded-2xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {MENU_LINKS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              role="menuitem"
              className="block px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <div className="my-1 border-t border-slate-100" />
          <button
            type="button"
            role="menuitem"
            className="block w-full px-4 py-2.5 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
            onClick={() => {
              setOpen(false)
              onSignOut()
            }}
          >
            ログアウト
          </button>
        </div>
      ) : null}
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
