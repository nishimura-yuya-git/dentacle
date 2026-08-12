/**
 * Geolonia map-full.svg の viewBox ズーム用（地方・データ範囲）。
 * 座標は SVG 表示座標。DB 非保存。
 */

export const JAPAN_MAP_FULL_VIEWBOX = '0 0 1000 1000'

export type JapanMapRegionId =
  | 'all'
  | 'auto'
  | 'hokkaido'
  | 'tohoku'
  | 'kanto'
  | 'chubu'
  | 'kinki'
  | 'chugoku'
  | 'shikoku'
  | 'kyushu'

export type JapanMapRegionOption = {
  id: JapanMapRegionId
  label: string
  /** querySelectorAll 用。all/auto は null */
  selector: string | null
  /**
   * ズーム専用セレクタ。未指定時は selector を使う。
   * Geolonia は沖縄・鹿児島離島を地図内インセットで描くため、
   * 九州全体を外接すると全国並みにズームアウトする。
   */
  zoomSelector?: string | null
}

/** 地方チップ（八地方区分に近い Geolonia class） */
export const JAPAN_MAP_REGION_OPTIONS: JapanMapRegionOption[] = [
  { id: 'all', label: '全国', selector: null },
  { id: 'auto', label: 'データ範囲', selector: null },
  { id: 'hokkaido', label: '北海道', selector: '.geolonia-svg-map .prefecture.hokkaido' },
  { id: 'tohoku', label: '東北', selector: '.geolonia-svg-map .prefecture.tohoku' },
  { id: 'kanto', label: '関東', selector: '.geolonia-svg-map .prefecture.kanto' },
  { id: 'chubu', label: '中部', selector: '.geolonia-svg-map .prefecture.chubu' },
  { id: 'kinki', label: '近畿', selector: '.geolonia-svg-map .prefecture.kinki' },
  { id: 'chugoku', label: '中国', selector: '.geolonia-svg-map .prefecture.chugoku' },
  { id: 'shikoku', label: '四国', selector: '.geolonia-svg-map .prefecture.shikoku' },
  {
    id: 'kyushu',
    label: '九州・沖縄',
    // 塗り等は従来どおり。ズームは本土のみ（沖縄・鹿児島離島インセット除外）
    selector:
      '.geolonia-svg-map .prefecture.kyushu, .geolonia-svg-map .prefecture.okinawa, .geolonia-svg-map .prefecture.kyushu-okinawa',
    zoomSelector:
      '.geolonia-svg-map .prefecture.fukuoka, .geolonia-svg-map .prefecture.saga, .geolonia-svg-map .prefecture.nagasaki, .geolonia-svg-map .prefecture.kumamoto, .geolonia-svg-map .prefecture.oita, .geolonia-svg-map .prefecture.miyazaki',
  },
]

export type SvgViewBox = {
  x: number
  y: number
  width: number
  height: number
}

/** 要素群の外接矩形を SVG ユーザー座標で求める */
export function unionElementsViewBox(
  svg: SVGSVGElement,
  elements: Element[],
  paddingRatio = 0.12,
): SvgViewBox | null {
  if (elements.length === 0) return null
  const inverse = svg.getScreenCTM()?.inverse()
  if (!inverse) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let hit = false

  for (const element of elements) {
    const rect = element.getBoundingClientRect()
    if (rect.width <= 0 && rect.height <= 0) continue
    const p1 = svg.createSVGPoint()
    p1.x = rect.left
    p1.y = rect.top
    const p2 = svg.createSVGPoint()
    p2.x = rect.right
    p2.y = rect.bottom
    const a = p1.matrixTransform(inverse)
    const b = p2.matrixTransform(inverse)
    minX = Math.min(minX, a.x, b.x)
    minY = Math.min(minY, a.y, b.y)
    maxX = Math.max(maxX, a.x, b.x)
    maxY = Math.max(maxY, a.y, b.y)
    hit = true
  }

  if (!hit) return null

  const width = Math.max(maxX - minX, 24)
  const height = Math.max(maxY - minY, 24)
  const pad = Math.max(width, height) * paddingRatio
  // 正方形に近い viewBox の方が横長コンテナでも余白が偏りにくい
  const side = Math.max(width, height) + pad * 2
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2

  return {
    x: cx - side / 2,
    y: cy - side / 2,
    width: side,
    height: side,
  }
}

export function formatSvgViewBox(box: SvgViewBox): string {
  return `${box.x} ${box.y} ${box.width} ${box.height}`
}

export function applySvgViewBox(svg: SVGSVGElement, box: SvgViewBox | null): void {
  if (!box) {
    svg.setAttribute('viewBox', JAPAN_MAP_FULL_VIEWBOX)
    return
  }
  svg.setAttribute('viewBox', formatSvgViewBox(box))
}

/** セレクタまたは要素リストへズーム。失敗時は全国 */
export function zoomSvgToSelector(
  root: ParentNode,
  svg: SVGSVGElement,
  selector: string | null,
  options?: { paddingRatio?: number; expandSouthRatio?: number },
): boolean {
  if (!selector) {
    applySvgViewBox(svg, null)
    return true
  }
  const paddingRatio = options?.paddingRatio ?? 0.12
  const elements = [...root.querySelectorAll(selector)]
  let box = unionElementsViewBox(svg, elements, paddingRatio)
  if (box && options?.expandSouthRatio && options.expandSouthRatio > 0) {
    box = expandSvgViewBoxSouth(box, options.expandSouthRatio)
  }
  applySvgViewBox(svg, box)
  return box != null
}

/** 地方オプションのズーム用セレクタ（zoomSelector 優先） */
export function resolveJapanMapZoomSelector(
  option: JapanMapRegionOption | undefined,
): string | null {
  if (!option) return null
  if (option.zoomSelector !== undefined) return option.zoomSelector
  return option.selector
}

/** 九州ズーム後に南へ少し広げ、鹿児島本土が切れにくくする */
export function expandSvgViewBoxSouth(box: SvgViewBox, ratio = 0.18): SvgViewBox {
  const extra = box.height * ratio
  return {
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height + extra,
  }
}

export function zoomSvgToElements(
  svg: SVGSVGElement,
  elements: Element[],
): boolean {
  const box = unionElementsViewBox(svg, elements)
  applySvgViewBox(svg, box)
  return box != null
}
