type Props = {
  children: string
}

/** ログイン系のエラー。塗り箱にせず、入力の近くに赤テキストだけ出す。 */
export function LoginErrorText({ children }: Props) {
  return (
    <p role="alert" className="text-sm font-medium text-rose-600">
      {children}
    </p>
  )
}
