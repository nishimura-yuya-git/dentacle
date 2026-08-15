type PasswordSetupUser = {
  user_metadata?: Record<string, unknown> | null
} | null

export function needsPasswordSetup(user: PasswordSetupUser): boolean {
  return user?.user_metadata?.must_set_password === true
}
