import { useEffect, useId, useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  isNavItemActive,
  TOP_NAV,
  type AppNavItem,
} from '@/components/layout/navConfig'
import { useClinic } from '@/features/clinic/useClinic'

const ITEM_BASE =
  'flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm transition'
const ITEM_ACTIVE = 'bg-[#008C01]/12 font-bold text-[#008C01]'
const ITEM_IDLE = 'font-medium text-slate-700 hover:bg-slate-100'

/** 左サイドバーの業務ナビ。子メニューを持つ項目（患者管理）は下に展開する */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation()
  const { isPlatformAdmin } = useClinic()
  const items = useMemo(
    () =>
      TOP_NAV.filter(
        (item) => !item.requiresPlatformAdmin || isPlatformAdmin,
      ),
    [isPlatformAdmin],
  )

  return (
    <nav className="flex flex-col gap-1" aria-label="業務ナビ">
      {items.map((item) => {
        const active = isNavItemActive(pathname, item)
        if (item.menuItems?.length) {
          return (
            <NavGroup
              key={item.to}
              item={item}
              active={active}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          )
        }
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={[ITEM_BASE, 'gap-2', active ? ITEM_ACTIVE : ITEM_IDLE].join(' ')}
          >
            {item.iconSrc ? <NavIcon src={item.iconSrc} active={active} /> : null}
            <span className="truncate">{item.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

function navGroupStorageKey(to: string) {
  return `dentacle.sidebar.navOpen:${to}`
}

function readNavGroupOpen(to: string, fallback: boolean): boolean {
  try {
    const stored = sessionStorage.getItem(navGroupStorageKey(to))
    if (stored === '1') return true
    if (stored === '0') return false
  } catch {
    // sessionStorage 不可時はフォールバック
  }
  return fallback
}

function writeNavGroupOpen(to: string, open: boolean) {
  try {
    sessionStorage.setItem(navGroupStorageKey(to), open ? '1' : '0')
  } catch {
    // sessionStorage 不可時は無視
  }
}

function NavGroup({
  item,
  active,
  pathname,
  onNavigate,
}: {
  item: AppNavItem
  active: boolean
  pathname: string
  onNavigate?: () => void
}) {
  const [open, setOpen] = useState(() => readNavGroupOpen(item.to, active))
  const listId = useId()

  useEffect(() => {
    if (!active) return
    setOpen(true)
    writeNavGroupOpen(item.to, true)
  }, [active, item.to])

  return (
    <div className="flex flex-col">
      <button
        type="button"
        className={[
          ITEM_BASE,
          'justify-between gap-2',
          active ? ITEM_ACTIVE : ITEM_IDLE,
        ].join(' ')}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          setOpen((current) => {
            const next = !current
            writeNavGroupOpen(item.to, next)
            return next
          })
        }}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {item.iconSrc ? <NavIcon src={item.iconSrc} active={active} /> : null}
          <span className="truncate">{item.label}</span>
        </span>
        <span
          className={['shrink-0 text-[10px] leading-none transition', open ? 'rotate-180' : ''].join(
            ' ',
          )}
          aria-hidden
        >
          ▼
        </span>
      </button>

      {open ? (
        <div id={listId} className="mt-1 flex flex-col gap-0.5 pl-3">
          {item.menuItems?.map((child) => {
            const selected =
              pathname === child.to || pathname.startsWith(`${child.to}/`)
            return (
              <NavLink
                key={child.to}
                to={child.to}
                onClick={onNavigate}
                className={[
                  'rounded-r-lg border-l border-dashed py-2 pl-3 pr-2 text-sm transition',
                  selected
                    ? 'border-[#008C01] font-bold text-[#008C01]'
                    : 'border-slate-300 font-medium text-slate-600 hover:bg-slate-50',
                ].join(' ')}
              >
                {child.label}
              </NavLink>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

/** PNG をマスクし、選択中は緑・通常は灰色でナビ文字と揃える */
function NavIcon({ src, active }: { src: string; active: boolean }) {
  return (
    <span
      aria-hidden
      className={[
        'inline-block h-4 w-4 shrink-0',
        active ? 'bg-[#008C01]' : 'bg-slate-400',
      ].join(' ')}
      style={{
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
      }}
    />
  )
}
