export type PlaceAccountMenuTrigger = {
  top: number
  right: number
  bottom: number
  left: number
  width: number
  height: number
}

export type PlaceAccountMenuInput = {
  trigger: PlaceAccountMenuTrigger
  menuWidth: number
  /** 開く方向の判定に使う。実際の描画高さではなく見積もりでよい */
  menuHeight: number
  viewportWidth: number
  viewportHeight: number
  gap?: number
  margin?: number
}

export type PlaceAccountMenuResult = {
  openUp: boolean
  left: number
  width: number
  maxHeight: number
  /** 下開きのとき。上開きでは null */
  top: number | null
  /** 上開きのとき、ビューポート下端からの距離。下開きでは null */
  bottom: number | null
}

const DEFAULT_GAP = 8
const DEFAULT_MARGIN = 8

/**
 * アカウントメニューの fixed 配置。
 * 下端トリガーでは bottom アンカーで上に開き、高さの再計測で位置が跳ねないようにする。
 */
export function placeAccountMenu({
  trigger,
  menuWidth,
  menuHeight,
  viewportWidth,
  viewportHeight,
  gap = DEFAULT_GAP,
  margin = DEFAULT_MARGIN,
}: PlaceAccountMenuInput): PlaceAccountMenuResult {
  const spaceBelow = viewportHeight - trigger.bottom - gap - margin
  const spaceAbove = trigger.top - gap - margin
  const openUp = spaceBelow < menuHeight && spaceAbove > spaceBelow

  const available = Math.max(0, openUp ? spaceAbove : spaceBelow)
  const width = Math.min(menuWidth, Math.max(0, viewportWidth - margin * 2))
  const left = Math.min(Math.max(margin, trigger.right - width), viewportWidth - width - margin)

  if (openUp) {
    return {
      openUp: true,
      left,
      width,
      maxHeight: available,
      top: null,
      bottom: viewportHeight - trigger.top + gap,
    }
  }

  return {
    openUp: false,
    left,
    width,
    maxHeight: available,
    top: trigger.bottom + gap,
    bottom: null,
  }
}
