import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AccountMenu } from '@/components/layout/AccountMenu'
import { env } from '@/config/env'
import { useAuth } from '@/features/auth/useAuth'
import { SecurityRail } from '@/pages/Security/sections/SecurityRail'
import { SecuritySiteFooter } from '@/pages/Security/sections/SecuritySiteFooter'

type Props = {
  children: ReactNode
  /** article は安全性の白パネル。plain はヘルプのFAQグループをキャンバスに置く */
  surface?: 'article' | 'plain'
}

/**
 * 文書シェル（安全性・ヘルプ）。
 * 業務サイドバー・クリニック名ピル・ご意見 FAB は出さない。
 */
export function SecurityLayout({ children, surface = 'article' }: Props) {
  const { signOut } = useAuth()
  const [navOpen, setNavOpen] = useState(false)

  useEffect(() => {
    if (!navOpen) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setNavOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [navOpen])

  return (
    <div className="flex min-h-dvh bg-[linear-gradient(-15deg,#F8FBF8,#F0F9F0,#E7F4E8_85%)]">
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 border-r border-slate-200/70 bg-white md:flex md:flex-col">
        <SecurityRail onSignOut={() => void signOut()} />
      </aside>

      {navOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="メニューを閉じる"
            onClick={() => setNavOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="案内メニュー"
            className="absolute inset-y-0 left-0 flex w-56 flex-col border-r border-slate-200/70 bg-white shadow-lg"
          >
            <SecurityRail
              onSignOut={() => void signOut()}
              onNavigate={() => setNavOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[52px] items-center gap-3 border-b border-slate-200/70 bg-white px-3 md:hidden">
          <button
            type="button"
            className="inline-flex shrink-0 items-center justify-center rounded-lg p-1.5 transition-colors hover:bg-slate-100"
            aria-label="メニューを開く"
            aria-expanded={navOpen}
            onClick={() => setNavOpen(true)}
          >
            <img src="/icon/grid.png" alt="" width={20} height={20} className="h-5 w-5" />
          </button>
          <Link to="/calendar" className="truncate text-sm font-bold text-[#008C01]">
            {env.appName}
          </Link>
          <div className="ml-auto">
            <AccountMenu alone onSignOut={() => void signOut()} />
          </div>
        </header>

        <main className="flex-1 px-5 py-10 md:px-8 md:py-12">
          <div className="mx-auto w-full max-w-4xl">
            {surface === 'article' ? (
              <article className="rounded-[32px] bg-white p-5 font-normal leading-[1.7] text-[16px] text-slate-900 shadow-[0_2px_5px_-2px_rgba(0,20,40,0.08)] sm:p-7 md:p-8">
                {children}
              </article>
            ) : (
              children
            )}
            <SecuritySiteFooter />
          </div>
        </main>
      </div>
    </div>
  )
}
