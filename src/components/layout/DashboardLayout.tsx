import { useCallback, useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { AccountMenu } from '@/components/layout/AccountMenu'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { ClinicSwitcher } from '@/components/layout/ClinicSwitcher'
import { env } from '@/config/env'
import { useAuth } from '@/features/auth/useAuth'
import { useClinic } from '@/features/clinic/useClinic'

/**
 * 左サイドバーナビ構成。ヘッダーはクリニック名ピルとページ見出し帯のみ。
 * 色・フォントはデンタクル（緑 / Zen Maru Gothic）を維持。
 */
export function DashboardLayout({
  title,
  description,
  titleAside,
  centerTitleAside = false,
  hidePageHeading = false,
  fillViewport = false,
  actions,
  children,
}: {
  title: string
  description?: string
  /** タイトル右隣（検索など）。centerTitleAside 時はヘッダー中央 */
  titleAside?: ReactNode
  /** titleAside をタイトルと actions のあいだ中央に置く（カレンダー日付ナビなど） */
  centerTitleAside?: boolean
  /** true のときページタイトル帯（見出し・説明・actions 行）を出さない */
  hidePageHeading?: boolean
  /**
   * true のとき画面高さいっぱいに収める（ページ全体スクロールを抑制）。
   * 子側で min-h-0 / overflow を管理する前提。
   */
  fillViewport?: boolean
  actions?: ReactNode
  children: ReactNode
}) {
  const { signOut } = useAuth()
  const { clinic, clinics, setClinicId, canSwitchClinics } = useClinic()
  const [navOpen, setNavOpen] = useState(false)
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const closeNav = useCallback(() => setNavOpen(false), [])
  const headingPad = fillViewport ? 'px-4 py-2' : 'px-4 py-3'
  /** タイトル文言があるときは actions を右端へ。空タイトル＋titleAside はツールバー連続配置 */
  const hasHeadingText = Boolean(title.trim() || description)

  return (
    <div
      className={
        fillViewport
          ? 'flex h-dvh overflow-hidden bg-[#FAFAFA]'
          : 'flex min-h-screen bg-[#FAFAFA]'
      }
    >
      <AppSidebar
        open={navOpen}
        onClose={closeNav}
        desktopVisible={sidebarVisible}
        onToggleDesktop={() => setSidebarVisible((current) => !current)}
      />

      <div
        className={
          fillViewport
            ? 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'
            : 'flex min-w-0 flex-1 flex-col'
        }
      >
        <header className="z-20 shrink-0 border-b border-[#DCDEDE] bg-white">
          <div className="flex h-[52px] items-center gap-3 px-3 md:px-4">
            {/* サイドバー非表示時・モバイル時のみ。表示中はブランド右（サイドバー内）に置く */}
            <button
              type="button"
              className={[
                'inline-flex shrink-0 items-center justify-center rounded-lg p-1.5 transition hover:bg-slate-100',
                sidebarVisible ? 'md:hidden' : '',
              ].join(' ')}
              aria-label={sidebarVisible ? 'メニューを開く' : 'サイドバーを表示'}
              aria-expanded={sidebarVisible || navOpen}
              aria-controls="app-sidebar"
              onClick={() => {
                if (typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches) {
                  setSidebarVisible(true)
                  return
                }
                setNavOpen(true)
              }}
            >
              <img src="/icon/grid.png" alt="" width={20} height={20} className="h-5 w-5" />
            </button>

            <NavLink
              to="/calendar"
              className={[
                'flex shrink-0 items-center',
                sidebarVisible ? 'md:hidden' : '',
              ].join(' ')}
              aria-label={`${env.appName}（ロゴ差し替え予定）`}
            >
              <span className="text-sm font-bold text-[#008C01]">{env.appName}</span>
            </NavLink>

            <div className="relative z-30 ml-auto flex shrink-0 items-center">
              {(clinic || clinics.length > 0) ? (
                <div className="inline-flex items-stretch rounded-full border border-slate-700 bg-white">
                  <ClinicSwitcher
                    clinic={clinic}
                    clinics={clinics}
                    onSelect={setClinicId}
                    allowSwitch={canSwitchClinics}
                  />
                  <AccountMenu onSignOut={() => void signOut()} />
                </div>
              ) : (
                <div className="inline-flex items-stretch rounded-full border border-slate-700 bg-white">
                  <AccountMenu alone onSignOut={() => void signOut()} />
                </div>
              )}
            </div>
          </div>

          {!hidePageHeading ? (
            centerTitleAside ? (
              <div
                className={`grid grid-cols-1 items-center gap-3 border-t border-slate-100 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] ${headingPad}`}
              >
                {title.trim() || description ? (
                  <div className="min-w-0 shrink-0">
                    {title.trim() ? (
                      <h1 className="truncate text-base font-bold text-slate-900 md:text-lg">
                        {title}
                      </h1>
                    ) : null}
                    {description ? (
                      <p className="mt-0.5 text-xs font-medium text-slate-400">{description}</p>
                    ) : null}
                  </div>
                ) : (
                  <div />
                )}
                {titleAside ? (
                  <div className="flex min-w-0 justify-center md:justify-self-center">
                    {titleAside}
                  </div>
                ) : (
                  <div />
                )}
                <div className="flex flex-wrap items-center gap-2 md:justify-self-end">
                  {actions}
                </div>
              </div>
            ) : (
              <div
                className={[
                  'flex flex-nowrap items-center overflow-x-auto border-t border-slate-100',
                  hasHeadingText ? 'justify-between gap-3' : 'justify-start gap-4',
                  headingPad,
                ].join(' ')}
              >
                <div
                  className={[
                    'flex flex-nowrap items-center gap-3',
                    // タイトルあり: 右寄せ用に伸縮。潰しすぎないよう max-content 下限
                    // タイトルなし（カレンダー等）: 伸縮せず操作群を直後に続ける
                    hasHeadingText ? 'min-w-max flex-1' : 'shrink-0',
                  ].join(' ')}
                >
                  {hasHeadingText ? (
                    <div className="min-w-0 shrink-0">
                      {title.trim() ? (
                        <h1 className="truncate text-base font-bold text-slate-900 md:text-lg">
                          {title}
                        </h1>
                      ) : null}
                      {description ? (
                        <p className="mt-0.5 text-xs font-medium text-slate-400">{description}</p>
                      ) : null}
                    </div>
                  ) : null}
                  {titleAside ? <div className="shrink-0">{titleAside}</div> : null}
                </div>
                {actions ? (
                  <div className="flex shrink-0 flex-nowrap items-center gap-2">
                    {actions}
                  </div>
                ) : null}
              </div>
            )
          ) : null}
        </header>

        <main
          className={
            fillViewport
              ? 'flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-2 md:px-4 md:py-3'
              : 'px-4 py-4 md:px-5 md:py-5'
          }
        >
          {children}
        </main>
      </div>
    </div>
  )
}
