import {
  MFA_AUTHENTICATOR_STORE_LINKS,
  isAllowedAuthenticatorStoreHref,
} from '@/pages/Login/mfaEnrollCopy'

/** 認証アプリ入手リンク。公式ストアのアイコンをラベルの左に置く。 */
export function MfaStoreLinks() {
  const links = MFA_AUTHENTICATOR_STORE_LINKS.filter((link) =>
    isAllowedAuthenticatorStoreHref(link.href),
  )

  return (
    <span className="mt-0.5 flex flex-wrap items-center gap-y-1 text-xs font-medium text-slate-400">
      {links.map((link, index) => (
        <span key={link.href} className="inline-flex items-center">
          {index > 0 ? <span className="px-1.5">／</span> : null}
          <a
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-bold text-[#008C01] underline decoration-dotted underline-offset-4"
          >
            <img
              src={link.iconSrc}
              alt=""
              width={16}
              height={16}
              className="h-4 w-4 shrink-0 object-contain"
              draggable={false}
            />
            {link.label}
          </a>
        </span>
      ))}
    </span>
  )
}
