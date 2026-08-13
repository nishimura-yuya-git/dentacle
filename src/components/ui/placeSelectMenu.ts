export type SelectMenuTriggerRect = {
  left: number
  right: number
  top: number
  bottom: number
  width: number
}

export type SelectMenuViewport = {
  width: number
  height: number
}

const MENU_GAP = 6
const MENU_EDGE = 8
const MENU_MIN = 120
const MENU_MAX = 480
const ITEM_HEIGHT = 40
const MENU_PAD = 16
const MENU_CHROME = 58
const CHAR_PX = 14

/** ラベル長からメニュー幅を見積もる。トリガーより狭くせず、画面端も超えない。 */
export function estimateSelectMenuWidth(
  labels: readonly string[],
  triggerWidth: number,
  viewportWidth: number,
): number {
  const longest = labels.reduce((max, label) => Math.max(max, label.length), 0)
  const content = longest * CHAR_PX + MENU_CHROME
  const maxWidth = Math.min(MENU_MAX, Math.max(MENU_MIN, viewportWidth - MENU_EDGE * 2))
  return Math.min(maxWidth, Math.max(triggerWidth, MENU_MIN, content))
}

/** トリガー位置から portal メニューの fixed 座標を決める。右端では左へ広げる。 */
export function placeSelectMenu(
  trigger: SelectMenuTriggerRect,
  viewport: SelectMenuViewport,
  optionCount: number,
  labels: readonly string[] = [],
): {
  position: 'fixed'
  top?: number
  bottom?: number
  left: number
  width: number
  minWidth: number
  maxWidth: number
  zIndex: number
} {
  const width = estimateSelectMenuWidth(labels, trigger.width, viewport.width)
  const maxLeft = viewport.width - width - MENU_EDGE
  let left = trigger.left
  if (left > maxLeft) {
    left = Math.max(MENU_EDGE, trigger.right - width)
  }
  if (left > maxLeft) {
    left = Math.max(MENU_EDGE, maxLeft)
  }

  const estimatedHeight = Math.min(optionCount * ITEM_HEIGHT + MENU_PAD, 280)
  const spaceBelow = viewport.height - trigger.bottom - MENU_GAP
  const openUp = spaceBelow < estimatedHeight && trigger.top > spaceBelow

  return {
    position: 'fixed',
    top: openUp ? undefined : trigger.bottom + MENU_GAP,
    bottom: openUp ? viewport.height - trigger.top + MENU_GAP : undefined,
    left,
    width,
    minWidth: width,
    maxWidth: width,
    zIndex: 70,
  }
}
