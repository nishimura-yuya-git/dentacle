import { useEffect, useMemo, useRef, useState } from 'react'
import {
  getJapanPrefectureCode,
  getJapanPrefectureKeyByCode,
  getJapanPrefecturePin,
} from '@/pages/AuthAudit/japanPrefecturePins'
import {
  JAPAN_MAP_REGION_OPTIONS,
  type JapanMapRegionId,
  applySvgViewBox,
  resolveJapanMapZoomSelector,
  zoomSvgToElements,
  zoomSvgToSelector,
} from '@/pages/AuthAudit/japanMapZoom'
import { applyTrustedMapSvg } from '@/pages/AuthAudit/applyTrustedMapSvg'
import type { AuthAuditMapCluster } from '@/pages/AuthAudit/resolveAuthAuditMapPin'
import { AUTH_AUDIT_PIN_OVERSEAS } from '@/pages/AuthAudit/resolveAuthAuditMapPin'

/** Geolonia japanese-prefectures（GFDL） */
const MAP_SVG_URL = '/icon/map-full.svg'

const FILL_IDLE = '#f1f5f9'
const FILL_HOVER = '#bbf7d0'
const FILL_ACTIVE = '#86efac'
const FILL_ACTIVE_STRONG = '#22c55e'
const FILL_SELECTED = '#008C01'
const STROKE = '#94a3b8'

type Props = {
  clusters: AuthAuditMapCluster[]
  selectedKey: string | null
  onSelect: (key: string | null) => void
  loading: boolean
}

type CountBadge = {
  key: string
  label: string
  count: number
  leftPct: number
  topPct: number
}

type HoverTip = {
  label: string
  count: number | null
  x: number
  y: number
}

function baseFillForPref(input: {
  cluster?: AuthAuditMapCluster
  selected: boolean
}): string {
  if (input.selected) return FILL_SELECTED
  if (!input.cluster) return FILL_IDLE
  return input.cluster.count >= 3 ? FILL_ACTIVE_STRONG : FILL_ACTIVE
}

function applyPrefFill(pref: SVGGElement, fill: string): void {
  pref.style.fill = fill
  pref.querySelectorAll<SVGElement>('polygon, path').forEach((child) => {
    child.style.fill = fill
  })
}

function prefectureElementsByCodes(root: ParentNode, codes: string[]): Element[] {
  const found: Element[] = []
  for (const code of codes) {
    const numeric = String(Number(code))
    const padded = numeric.padStart(2, '0')
    const el =
      root.querySelector(`.geolonia-svg-map .prefecture[data-code="${numeric}"]`) ??
      root.querySelector(`.geolonia-svg-map .prefecture[data-code="${padded}"]`)
    if (el) found.push(el)
  }
  return found
}

/** Geolonia map-full.svg による都道府県塗り分け（運営ログイン監査） */
export function AuthAuditJapanMap({ clusters, selectedKey, onSelect, loading }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const mapFrameRef = useRef<HTMLDivElement>(null)
  const [svgReady, setSvgReady] = useState(false)
  const [svgError, setSvgError] = useState<string | null>(null)
  const [badges, setBadges] = useState<CountBadge[]>([])
  const [frameTick, setFrameTick] = useState(0)
  const [zoomNonce, setZoomNonce] = useState(0)
  const [regionMode, setRegionMode] = useState<JapanMapRegionId>('auto')
  const [hoverTip, setHoverTip] = useState<HoverTip | null>(null)
  const mapWasVisibleRef = useRef(false)

  const overseas = clusters.find((c) => c.key === AUTH_AUDIT_PIN_OVERSEAS)
  const overseasCount = overseas?.count ?? 0
  const clusterByKey = useMemo(() => {
    const map = new Map<string, AuthAuditMapCluster>()
    for (const cluster of clusters) {
      if (cluster.kind === 'prefecture') map.set(cluster.key, cluster)
    }
    return map
  }, [clusters])

  const domesticCount = useMemo(
    () => [...clusterByKey.values()].reduce((sum, cluster) => sum + cluster.count, 0),
    [clusterByKey],
  )

  const activeCodes = useMemo(
    () =>
      [...clusterByKey.keys()]
        .map((key) => getJapanPrefectureCode(key))
        .filter((code): code is string => Boolean(code)),
    [clusterByKey],
  )

  const toggle = (key: string) => {
    onSelect(selectedKey === key ? null : key)
  }

  // SVG 読み込み
  useEffect(() => {
    let cancelled = false
    setSvgReady(false)
    setSvgError(null)

    void (async () => {
      try {
        const response = await fetch(MAP_SVG_URL)
        if (!response.ok) throw new Error(`地図の読み込みに失敗しました（${response.status}）`)
        const markup = await response.text()
        if (cancelled || !hostRef.current) return
        if (!applyTrustedMapSvg(hostRef.current, markup)) {
          throw new Error('地図データが不正です')
        }
        const svg = hostRef.current.querySelector('svg')
        if (svg) {
          svg.setAttribute('width', '100%')
          svg.setAttribute('height', '100%')
          svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
          svg.style.width = '100%'
          svg.style.height = '100%'
          svg.style.maxHeight = 'none'
          svg.style.display = 'block'
        }
        setSvgReady(true)
      } catch (error) {
        if (!cancelled) {
          setSvgError(error instanceof Error ? error.message : '地図の読み込みに失敗しました')
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  // 枠サイズ変化: バッジ再計算。hidden→表示になったらズームを再実行
  useEffect(() => {
    const frame = mapFrameRef.current
    if (!frame || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      const rect = frame.getBoundingClientRect()
      const visible = rect.width >= 8 && rect.height >= 8
      if (visible && !mapWasVisibleRef.current) {
        mapWasVisibleRef.current = true
        setZoomNonce((value) => value + 1)
      }
      if (!visible) mapWasVisibleRef.current = false
      setFrameTick((value) => value + 1)
    })
    observer.observe(frame)
    return () => observer.disconnect()
  }, [])

  // ズーム適用（地方 / データ範囲 / 全国）
  useEffect(() => {
    if (!svgReady || !hostRef.current || loading) return
    const root = hostRef.current
    const svg = root.querySelector('svg')
    if (!svg) return

    const frame = mapFrameRef.current?.getBoundingClientRect()
    // hidden 中は矩形が取れない → 表示復帰時の zoomNonce で再試行
    if (!frame || frame.width < 8 || frame.height < 8) return

    if (regionMode === 'all') {
      applySvgViewBox(svg, null)
    } else if (regionMode === 'auto') {
      const elements = prefectureElementsByCodes(root, activeCodes)
      if (elements.length === 0) {
        applySvgViewBox(svg, null)
      } else {
        zoomSvgToElements(svg, elements)
      }
    } else {
      const option = JAPAN_MAP_REGION_OPTIONS.find((item) => item.id === regionMode)
      // 九州は沖縄・離島インセットをズーム外接から外す
      const zoomSelector = resolveJapanMapZoomSelector(option)
      zoomSvgToSelector(
        root,
        svg,
        zoomSelector,
        option?.id === 'kyushu'
          ? { paddingRatio: 0.2, expandSouthRatio: 0.2 }
          : { paddingRatio: 0.12 },
      )
    }

    const raf = window.requestAnimationFrame(() => {
      setFrameTick((value) => value + 1)
    })
    return () => window.cancelAnimationFrame(raf)
  }, [svgReady, regionMode, activeCodes, loading, zoomNonce])

  // 塗り分け・ホバー名・クリック・件数バッジ
  useEffect(() => {
    if (!svgReady || !hostRef.current) return
    const root = hostRef.current
    const svg = root.querySelector('svg')
    if (!svg) return
    const frame = mapFrameRef.current

    const prefs = root.querySelectorAll<SVGGElement>('.geolonia-svg-map .prefecture')
    const cleanups: Array<() => void> = []

    prefs.forEach((pref) => {
      const code = pref.dataset.code ?? ''
      const key = getJapanPrefectureKeyByCode(code)
      const pin = key ? getJapanPrefecturePin(key) : undefined
      const label =
        pin?.name ??
        pref.querySelector('title')?.textContent?.split('/')[0]?.trim() ??
        '不明'
      const cluster = key ? clusterByKey.get(key) : undefined
      const selected = Boolean(key && selectedKey === key)
      const fill = baseFillForPref({ cluster, selected })

      applyPrefFill(pref, fill)
      pref.style.stroke = STROKE
      pref.style.strokeWidth = selected ? '1.6' : '1'
      pref.style.cursor = cluster ? 'pointer' : 'default'
      pref.style.opacity = selectedKey && !selected && !cluster ? '0.55' : '1'
      pref.querySelectorAll<SVGElement>('polygon, path').forEach((child) => {
        child.style.stroke = STROKE
      })

      const onEnter = (event: MouseEvent) => {
        if (!selected) applyPrefFill(pref, FILL_HOVER)
        const frameRect = frame?.getBoundingClientRect()
        if (!frameRect) return
        setHoverTip({
          label,
          count: cluster?.count ?? null,
          x: event.clientX - frameRect.left,
          y: event.clientY - frameRect.top,
        })
      }
      const onMove = (event: MouseEvent) => {
        const frameRect = frame?.getBoundingClientRect()
        if (!frameRect) return
        setHoverTip({
          label,
          count: cluster?.count ?? null,
          x: event.clientX - frameRect.left,
          y: event.clientY - frameRect.top,
        })
      }
      const onLeave = () => {
        applyPrefFill(pref, baseFillForPref({ cluster, selected }))
        setHoverTip(null)
      }
      const onClick = (event: Event) => {
        if (!key || !cluster) return
        event.preventDefault()
        event.stopPropagation()
        onSelect(selectedKey === key ? null : key)
      }

      pref.addEventListener('mouseenter', onEnter)
      pref.addEventListener('mousemove', onMove)
      pref.addEventListener('mouseleave', onLeave)
      pref.addEventListener('click', onClick)
      cleanups.push(() => {
        pref.removeEventListener('mouseenter', onEnter)
        pref.removeEventListener('mousemove', onMove)
        pref.removeEventListener('mouseleave', onLeave)
        pref.removeEventListener('click', onClick)
      })
    })

    const svgRect = svg.getBoundingClientRect()
    const nextBadges: CountBadge[] = []
    if (svgRect.width > 0 && svgRect.height > 0) {
      for (const cluster of clusterByKey.values()) {
        const code = getJapanPrefectureCode(cluster.key)
        if (!code) continue
        const pref = prefectureElementsByCodes(root, [code])[0] as SVGGElement | undefined
        if (!pref) continue
        try {
          const box = pref.getBBox()
          const ctm = pref.getScreenCTM()
          if (!ctm) continue
          const pt = svg.createSVGPoint()
          pt.x = box.x + box.width / 2
          pt.y = box.y + box.height / 2
          const screen = pt.matrixTransform(ctm)
          const hostRect = root.getBoundingClientRect()
          if (hostRect.width <= 0 || hostRect.height <= 0) continue
          nextBadges.push({
            key: cluster.key,
            label: cluster.label,
            count: cluster.count,
            leftPct: ((screen.x - hostRect.left) / hostRect.width) * 100,
            topPct: ((screen.y - hostRect.top) / hostRect.height) * 100,
          })
        } catch {
          // getBBox 失敗時はバッジ省略
        }
      }
    }
    setBadges(nextBadges)

    return () => {
      cleanups.forEach((fn) => fn())
      setHoverTip(null)
    }
  }, [svgReady, clusterByKey, selectedKey, onSelect, frameTick])

  return (
    <div className="flex h-full min-h-0 flex-col rounded-[24px] border border-slate-100 bg-gradient-to-br from-[#F0F9F0] via-white to-slate-50 p-3 shadow-sm md:p-4">
      <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-slate-900">推定ログイン位置</h2>
          <p className="mt-0.5 text-[11px] font-medium text-slate-400">
            地方でズーム、都道府県クリックで一覧へ（IP推定・VPNでずれることあり）
          </p>
        </div>
        {selectedKey ? (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] font-bold text-white transition hover:bg-slate-700"
          >
            絞り込み解除
          </button>
        ) : null}
      </div>

      <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-wrap gap-1.5">
          {JAPAN_MAP_REGION_OPTIONS.map((option) => {
            const active = regionMode === option.id
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setRegionMode(option.id)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                  active
                    ? 'bg-[#008C01] text-white'
                    : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>
        {/* 地方チップ行の右端（地図の上・空きスペース） */}
        <div className="ml-auto flex shrink-0 items-center gap-3 text-[12px] font-bold tabular-nums">
          <span className="text-slate-600">
            国内<span className="ml-1.5 text-slate-900">{domesticCount}</span>
          </span>
          <button
            type="button"
            disabled={overseasCount === 0}
            onClick={() => toggle(AUTH_AUDIT_PIN_OVERSEAS)}
            className={`transition disabled:cursor-default ${
              selectedKey === AUTH_AUDIT_PIN_OVERSEAS
                ? 'text-rose-700 underline decoration-rose-300'
                : overseasCount > 0
                  ? 'text-rose-600 hover:text-rose-700'
                  : 'text-slate-400'
            }`}
            title={overseasCount > 0 ? '海外を一覧で絞り込む' : undefined}
          >
            海外<span className="ml-1.5">{overseasCount}</span>
          </button>
        </div>
      </div>

      <div
        ref={mapFrameRef}
        className="relative min-h-0 flex-1 overflow-hidden rounded-[18px] border border-slate-100 bg-slate-50/80"
      >
        <div
          ref={hostRef}
          className={`absolute inset-0 ${loading || svgError ? 'invisible' : 'visible'}`}
        />

        {badges.map((badge) => {
          if (loading || svgError) return null
          const selected = selectedKey === badge.key
          return (
            <button
              key={badge.key}
              type="button"
              title={`${badge.label} ${badge.count}件`}
              onClick={() => toggle(badge.key)}
              className={`absolute z-10 flex h-7 min-w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full px-1.5 text-[11px] font-black text-white shadow-sm ring-2 ring-white transition ${
                selected ? 'scale-110 bg-[#006b01]' : 'bg-[#008C01] hover:scale-105'
              }`}
              style={{ left: `${badge.leftPct}%`, top: `${badge.topPct}%` }}
            >
              {badge.count > 9 ? '9+' : badge.count}
            </button>
          )
        })}
        {hoverTip && !loading && !svgError ? (
          <div
            className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-[120%] rounded-xl bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-lg"
            style={{ left: hoverTip.x, top: hoverTip.y }}
          >
            {hoverTip.label}
            {hoverTip.count != null ? (
              <span className="ml-1.5 font-medium text-emerald-200">{hoverTip.count}件</span>
            ) : null}
          </div>
        ) : null}
        {loading ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 text-sm text-slate-400">
            位置を推定中…
          </div>
        ) : null}
        {svgError ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white px-4 text-center text-sm text-rose-600">
            {svgError}
          </div>
        ) : null}
        <p className="pointer-events-none absolute bottom-1.5 right-2 z-10 text-[10px] font-medium text-slate-400">
          地図: Geolonia（GFDL）
        </p>
      </div>
    </div>
  )
}
