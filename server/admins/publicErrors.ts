export const PUBLIC_ADMIN_INVITE_ERROR = {
  unauthorized: 'ログインが必要です',
  forbidden: '権限がありません',
  bad_request: 'メールアドレスを入力してください',
  rate_limited: '連続招待はできません。しばらくしてからお試しください。',
  not_configured: '招待メールの準備がまだ完了していません。運営に連絡してください。',
  internal: '運営の招待に失敗しました。',
} as const

export type PublicAdminInviteErrorCode = keyof typeof PUBLIC_ADMIN_INVITE_ERROR

export function toPublicAdminInviteError(
  code: PublicAdminInviteErrorCode,
  override?: string,
): string {
  if (override?.trim()) return override
  return PUBLIC_ADMIN_INVITE_ERROR[code]
}
