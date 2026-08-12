/**
 * Supabase Auth のエラーを利用者向け日本語に変換する。
 */

export function toLoginErrorMessage(error: { message?: string; status?: number } | null): string {
  if (!error) {
    return 'ログインに失敗しました。もう一度お試しください。'
  }

  const message = (error.message ?? '').toLowerCase()

  if (
    message.includes('invalid login credentials') ||
    message.includes('invalid credentials')
  ) {
    return 'メールアドレスまたはパスワードが正しくありません。'
  }

  if (message.includes('email not confirmed')) {
    return 'メールアドレスの確認が完了していません。管理者にお問い合わせください。'
  }

  if (message.includes('too many requests') || error.status === 429) {
    return 'しばらく時間をおいてから再度お試しください。'
  }

  if (message.includes('network') || message.includes('fetch')) {
    return '通信に失敗しました。ネットワークを確認してください。'
  }

  return 'ログインに失敗しました。もう一度お試しください。'
}
