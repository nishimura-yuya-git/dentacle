import { useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { SidebarNav } from '@/components/layout/SidebarNav'
import { env } from '@/config/env'

type Props = {
  /** モバイル用ドロワーの開閉 */
  open: boolean
  onClose: () => void
  /** md以上でサイドバー本体を表示するか */
  desktopVisible: boolean
  /** デスクトップ側の表示切替（ブランド右の grid アイコン） */
  onToggleDesktop: () => void
}

/** 画面左端の業務ナビ。md以上は表示切替、md未満はドロワー */
export function AppSidebar({ open, onClose, desktopVisible, onToggleDesktop }: Props) {
  const { pathname } = useLocation()
  const lastPathRef = useRef(pathname)

  useEffect(() => {
    if (lastPathRef.current === pathname) return
    lastPathRef.current = pathname
    onClose()
  }, [pathname, onClose])

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  return (
    <>
      {desktopVisible ? (
        <aside
          id="app-sidebar"
          className="hidden w-56 shrink-0 flex-col border-r border-[#DCDEDE] bg-white md:flex"
        >
          <Brand onToggle={onToggleDesktop} />
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
            <SidebarNav />
          </div>
        </aside>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="メニューを閉じる"
            onClick={onClose}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="業務ナビ"
            className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-[#DCDEDE] bg-white shadow-lg"
          >
            <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-[#DCDEDE] px-4">
              <span className="text-sm font-bold text-[#008C01]">{env.appName}</span>
              <button
                type="button"
                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100"
                aria-label="メニューを閉じる"
                onClick={onClose}
              >
                <CloseIcon />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
              <SidebarNav onNavigate={onClose} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function Brand({ onToggle }: { onToggle: () => void }) {
  return (
    <div className="flex h-[52px] shrink-0 items-center justify-between gap-3 border-b border-[#DCDEDE] px-3">
      <NavLink
        to="/calendar"
        className="min-w-0 truncate text-sm font-bold text-[#008C01]"
        aria-label={`${env.appName}（ロゴ差し替え予定）`}
      >
        {env.appName}
      </NavLink>
      <button
        type="button"
        className="inline-flex shrink-0 items-center justify-center rounded-lg p-1.5 transition hover:bg-slate-100"
        aria-label="サイドバーを隠す"
        onClick={onToggle}
      >
        <img src="/icon/grid.png" alt="" width={20} height={20} className="h-5 w-5" />
      </button>
    </div>
  )
}
