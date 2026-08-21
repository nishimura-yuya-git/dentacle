/**
 * 運営 TOTP 初回登録の案内文。
 * iPhone 専用にしない。Google Authenticator は一例。
 */

export const MFA_ENROLL_TITLE = '認証アプリを登録'

export const MFA_ENROLL_LEAD =
  '運営アカウントは追加確認が必要です。認証アプリがまだない場合は、先にスマートフォンへ入れてください。iPhone でも Android でも構いません。'

export const MFA_ENROLL_STEPS = [
  '認証アプリを入れる（Google Authenticator など。他の認証アプリでも同じQRを読めます）',
  '下のQRをアプリで読む。読めないときは手動入力用キーを使う',
  'アプリに出た6桁を入れて「登録して入る」',
] as const

export const MFA_AUTHENTICATOR_STORE_LINKS = [
  {
    label: 'App Store',
    href: 'https://apps.apple.com/jp/app/google-authenticator/id388497605',
    iconSrc: '/icon/apple-store.svg',
  },
  {
    label: 'Google Play',
    href: 'https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2&hl=ja',
    iconSrc: '/icon/google-play.svg',
  },
] as const

/** 認証アプリの例示アイコン。パスに空白を入れない。 */
export const MFA_AUTHENTICATOR_ICON_SRC = '/icon/google-authenticator.png'

const ALLOWED_STORE_HOSTS = new Set(['apps.apple.com', 'play.google.com'])

/** 認証アプリ入手リンクとして出してよい URL か */
export function isAllowedAuthenticatorStoreHref(href: string): boolean {
  try {
    const url = new URL(href)
    if (url.protocol !== 'https:') return false
    return ALLOWED_STORE_HOSTS.has(url.hostname)
  } catch {
    return false
  }
}
