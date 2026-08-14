/** ご意見パネルを外側クリックで閉じてよいか。パネル・FAB・portalメニューは内側 */
export function shouldCloseFeedbackOnOutsideClick(input: {
  containedByRoot: boolean
  containedByIgnoreOutside: boolean
}): boolean {
  if (input.containedByRoot) return false
  if (input.containedByIgnoreOutside) return false
  return true
}

export function isFeedbackIgnoreOutsideTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return Boolean(
    target.closest('[data-anchored-ignore-outside="true"]') ||
      target.closest('[role="listbox"]'),
  )
}
