/** 運営の付与・解除。院のユーザー管理とは別レイヤー。 */

export function canEditPlatformAdmin(): boolean {
  return true
}

export function canRevokePlatformAdmin(args: {
  targetUserId: string
  selfUserId: string | null
  adminCount: number
}): boolean {
  if (args.adminCount <= 1) return false
  if (!args.selfUserId) return false
  if (args.targetUserId === args.selfUserId) return false
  return true
}

export function toPlatformAdminPublicError(raw: string, fallback: string): string {
  const message = raw.trim()
  if (
    message.includes('ログインが必要') ||
    message.includes('権限がありません') ||
    message.includes('見つかりません') ||
    message.includes('メールアドレスを入力') ||
    message.includes('対象が指定') ||
    message.includes('すでに運営') ||
    message.includes('クリニックの所属') ||
    message.includes('自分自身') ||
    message.includes('最後の運営') ||
    message.includes('表示名は') ||
    message.includes('メモは') ||
    message.includes('招待')
  ) {
    return message
  }
  return fallback
}
