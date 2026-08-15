/** 閉じているときだけ未読の点を出す。件数は出さない。 */
export function shouldShowFeedbackUnreadDot(input: {
  open: boolean
  hasUnreadReply: boolean
}): boolean {
  return !input.open && input.hasUnreadReply
}

export const FEEDBACK_UNREAD_ARIA_LABEL = 'ご意見への返答があります'
