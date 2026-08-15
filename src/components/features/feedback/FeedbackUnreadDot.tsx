/** FAB 右上の未読点。件数は出さない。ボタン面の淡い緑とは別要素。 */
export function FeedbackUnreadDot() {
  return (
    <span
      className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#008C01] ring-2 ring-white"
      aria-hidden="true"
    />
  )
}
