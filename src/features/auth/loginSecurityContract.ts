/**
 * ログイン／MFA／パスワード設定で画面に出してよい文言と、
 * 危険な QR スキームを拒否する契約。
 * Auth / DB の生メッセージを許可リストに入れない。
 */

export const LOGIN_PUBLIC_ERROR_MESSAGES = [
  'ログインに失敗しました。もう一度お試しください。',
  'メールアドレスまたはパスワードが正しくありません。',
  'メールアドレスの確認が完了していません。管理者にお問い合わせください。',
  'しばらく時間をおいてから再度お試しください。',
  '通信に失敗しました。ネットワークを確認してください。',
  'このIPアドレスからのログインは制限されています。運営にお問い合わせください。',
  'メールアドレスとパスワードを入力してください。',
] as const

export const MFA_PUBLIC_ERROR_MESSAGES = [
  '認証アプリの6桁コードを入力してください。',
  '認証の準備に失敗しました。もう一度お試しください。',
  'コードが正しくありません。もう一度入力してください。',
  '認証アプリの登録を開始できませんでした。',
] as const

export const SET_PASSWORD_PUBLIC_ERROR_MESSAGES = [
  'パスワードを入力してください。',
  'パスワードは8文字以上にしてください。',
  '確認用パスワードが一致しません。',
  'パスワードを保存できませんでした。もう一度お試しください。',
] as const

const ALL_PUBLIC_AUTH_MESSAGES: readonly string[] = [
  ...LOGIN_PUBLIC_ERROR_MESSAGES,
  ...MFA_PUBLIC_ERROR_MESSAGES,
  ...SET_PASSWORD_PUBLIC_ERROR_MESSAGES,
]

export function isAllowlistedPublicAuthMessage(message: string): boolean {
  return ALL_PUBLIC_AUTH_MESSAGES.includes(message)
}

/**
 * 表示漏れ検知用の敵対入力。攻撃手順ではなく、変換後に生値が残らないことを見る。
 */
export const LOGIN_ADVERSARIAL_INPUTS = [
  "' OR 1=1 --",
  "' OR '1'='1",
  "admin'--",
  "'; DROP TABLE users;--",
  "' UNION SELECT NULL--",
  '1=1',
  "' OR 1=1#",
  "') OR ('1'='1",
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  'javascript:alert(1)',
  '{{7*7}}',
  '${7*7}',
  '../../etc/passwd',
  'admin\r\nSet-Cookie: session=stolen',
  '\0admin',
  '<svg onload=alert(1)>',
  'data:text/html,<script>alert(1)</script>',
  "Invalid login credentials <script>alert(1)</script>",
  'Too many requests <img src=x onerror=alert(1)>',
  'Email not confirmed javascript:alert(1)',
  'network <script>document.cookie</script>',
  'A'.repeat(4000),
] as const

const MAX_MFA_QR_SRC_LENGTH = 200_000
const PNG_JPEG_DATA_URI = /^data:image\/(?:png|jpe?g);base64,[A-Za-z0-9+/=\s]+$/i
const SVG_BASE64_DATA_URI =
  /^data:image\/svg\+xml(?:;charset=utf-8|;utf-8)?;base64,[A-Za-z0-9+/=\s]+$/i
const SVG_UTF8_PREFIX = /^data:image\/svg\+xml(?:;charset=utf-8|;utf-8)?,/i

function svgPayloadLooksSafe(payload: string): boolean {
  if (/<script/i.test(payload)) return false
  if (/on\w+\s*=/i.test(payload)) return false
  if (/javascript:/i.test(payload)) return false
  return /<svg[\s>]/i.test(payload)
}

/** MFA 登録 QR の img src。javascript: や HTML data URI は拒否する。 */
export function isSafeMfaQrSrc(src: string): boolean {
  if (!src) return false
  const value = src.trim()
  if (!value || value.length > MAX_MFA_QR_SRC_LENGTH) return false
  if (/javascript:/i.test(value)) return false
  if (/data:\s*text\/html/i.test(value)) return false

  if (PNG_JPEG_DATA_URI.test(value)) return true
  if (SVG_BASE64_DATA_URI.test(value)) return true

  if (SVG_UTF8_PREFIX.test(value)) {
    const payload = value.slice(value.indexOf(',') + 1)
    try {
      return svgPayloadLooksSafe(decodeURIComponent(payload))
    } catch {
      return false
    }
  }

  return false
}
