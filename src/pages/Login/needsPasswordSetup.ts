type PasswordSetupUser = {
  app_metadata?: Record<string, unknown> | null
  user_metadata?: Record<string, unknown> | null
} | null

/** app_metadata が正。本人が書き換えられる user_metadata は旧招待の互換だけ。 */
export function needsPasswordSetup(user: PasswordSetupUser): boolean {
  if (user?.app_metadata?.must_set_password === true) return true
  if (user?.app_metadata?.must_set_password === false) return false
  return user?.user_metadata?.must_set_password === true
}
