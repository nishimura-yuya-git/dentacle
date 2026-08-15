/** 運営招待メールの正規化。前後空白を除き小文字にする。 */

export function normalizeInviteEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
  return email
}

export function isAlreadyRegisteredAuthError(message: string): boolean {
  const value = message.toLowerCase()
  return (
    value.includes('already been registered') ||
    value.includes('already registered') ||
    value.includes('user already exists') ||
    value.includes('already exists')
  )
}
