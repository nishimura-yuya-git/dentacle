import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'

type Props = {
  label: string
  children: ReactNode
  className?: string
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className' | 'title'>

export const ICON_HOVER_BUTTON_CLASS =
  'relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white transition hover:border-slate-300 hover:bg-slate-50'

const TIP_PORTAL_CLASS =
  'pointer-events-none fixed z-[100] -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm'

type TipPos = { top: number; left: number }

/**
 * 見出し帯の overflow-x-auto 等で absolute ツールチップがクリップされないよう、
 * body portal + fixed + z-[100] で前面表示する。
 */
export function useFixedHoverTip(
  anchorRef: RefObject<HTMLElement | null>,
  enabled = true,
) {
  const [pos, setPos] = useState<TipPos | null>(null)

  const update = useCallback(() => {
    const el = anchorRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setPos({
      top: rect.top - 6,
      left: rect.left + rect.width / 2,
    })
  }, [anchorRef])

  const show = useCallback(() => {
    if (!enabled) return
    update()
  }, [enabled, update])

  const hide = useCallback(() => {
    setPos(null)
  }, [])

  useLayoutEffect(() => {
    if (!pos) return
    const onScroll = () => update()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [pos, update])

  useLayoutEffect(() => {
    if (!enabled) setPos(null)
  }, [enabled])

  return { tipPos: pos, showTip: show, hideTip: hide }
}

/** portal ツールチップ描画（useFixedHoverTip と併用） */
export function FixedHoverTip({ label, pos }: { label: string; pos: TipPos | null }) {
  if (!pos || typeof document === 'undefined') return null
  return createPortal(
    <span
      role="tooltip"
      className={TIP_PORTAL_CLASS}
      style={{ top: pos.top, left: pos.left }}
    >
      {label}
    </span>,
    document.body,
  )
}

/** アイコンボタン＋ホバー／フォーカスで日本語ツールチップ（portal） */
export const IconHoverTooltip = forwardRef<HTMLButtonElement, Props>(
  function IconHoverTooltip(
    { label, children, className = '', type = 'button', onMouseEnter, onMouseLeave, onFocus, onBlur, ...rest },
    ref,
  ) {
    const localRef = useRef<HTMLButtonElement>(null)
    useImperativeHandle(ref, () => localRef.current as HTMLButtonElement)
    const { tipPos, showTip, hideTip } = useFixedHoverTip(localRef)

    return (
      <>
        <button
          ref={localRef}
          type={type}
          aria-label={label}
          className={`${ICON_HOVER_BUTTON_CLASS} ${className}`}
          onMouseEnter={(event) => {
            showTip()
            onMouseEnter?.(event)
          }}
          onMouseLeave={(event) => {
            hideTip()
            onMouseLeave?.(event)
          }}
          onFocus={(event) => {
            showTip()
            onFocus?.(event)
          }}
          onBlur={(event) => {
            hideTip()
            onBlur?.(event)
          }}
          {...rest}
        >
          {children}
        </button>
        <FixedHoverTip label={label} pos={tipPos} />
      </>
    )
  },
)
