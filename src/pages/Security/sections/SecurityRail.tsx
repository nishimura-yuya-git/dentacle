import { Link, NavLink } from 'react-router-dom'
import { AccountMenu } from '@/components/layout/AccountMenu'
import { env } from '@/config/env'
import {
  SECURITY_RAIL_BLURBS,
  SECURITY_RAIL_CTA,
  SECURITY_RAIL_NAV,
} from '@/pages/Security/securityCopy'

type Props = {
  onSignOut: () => void
  onNavigate?: () => void
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-xl px-3 py-2 text-sm font-bold transition-colors',
    isActive ? 'bg-[#008C01]/10 text-[#008C01]' : 'text-slate-700 hover:bg-slate-50',
  ].join(' ')

/** 業務サイドバーと同じ w-56。色・文言はデンタクル。 */
export function SecurityRail({ onSignOut, onNavigate }: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col px-[17px] pb-6 pt-4">
      <Link
        to="/calendar"
        className="truncate text-sm font-bold text-[#008C01]"
        aria-label={`${env.appName}（ロゴ差し替え予定）`}
        onClick={onNavigate}
      >
        {env.appName}
      </Link>

      <Link
        to={SECURITY_RAIL_CTA.href}
        className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-full border-[1.5px] border-slate-200 px-4 text-sm font-bold text-slate-900 transition-colors hover:border-emerald-300 hover:bg-emerald-50/50"
        onClick={onNavigate}
      >
        {SECURITY_RAIL_CTA.label}
      </Link>

      <div className="mt-6 rounded-2xl border border-dashed border-slate-200 px-3.5 py-3">
        <div className="space-y-2.5">
          {SECURITY_RAIL_BLURBS.map((line) => (
            <p key={line} className="text-[14px] leading-[1.5] text-slate-500">
              {line}
            </p>
          ))}
        </div>
      </div>

      <nav className="mt-8 flex flex-col gap-1" aria-label="案内">
        {SECURITY_RAIL_NAV.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === '/security' || !item.href.startsWith('/security/')}
            className={navClass}
            onClick={onNavigate}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
        <p className="text-sm font-bold text-slate-700">アカウント</p>
        <AccountMenu alone onSignOut={onSignOut} />
      </div>
    </div>
  )
}
