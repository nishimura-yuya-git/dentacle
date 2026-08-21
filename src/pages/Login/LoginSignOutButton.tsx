type Props = {
  onSignOut: () => void
}

/** ログイン中の MFA / 待ち画面からセッションを切る。監査完了は待たない。 */
export function LoginSignOutButton({ onSignOut }: Props) {
  return (
    <button
      type="button"
      className="py-2 text-center text-sm font-medium text-slate-400 transition-colors hover:text-slate-700"
      onClick={onSignOut}
    >
      ログアウト
    </button>
  )
}
