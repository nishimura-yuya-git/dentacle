import { useCallback, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { formatYen, USD_TO_JPY } from '@/config/aiModelPricing'
import { IconHoverTooltip } from '@/pages/Calendar/components/IconHoverTooltip'
import { useAnchoredPopover } from '@/pages/Calendar/hooks/useAnchoredPopover'

export type UsageTotals = {
  totalYen: number
  clinicLabel: string
  periodLabel: string
}

type Props = {
  totals: UsageTotals
}

const PANEL_WIDTH = 320

/** 合計アイコン（`public/icon/coin.png`） */
function CoinIcon() {
  return (
    <img
      src="/icon/coin.png"
      alt=""
      width={18}
      height={18}
      className="h-[18px] w-[18px] object-contain"
      draggable={false}
    />
  )
}

/** 連絡者リスト同様: アイコン → 近傍ポップオーバーで料金合計 */
export function AiUsageTotals({ totals }: Props) {
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const { buttonRef, panelRef, pos } = useAnchoredPopover({
    open,
    onClose: close,
    panelWidth: PANEL_WIDTH,
  })

  return (
    <>
      <IconHoverTooltip
        ref={buttonRef}
        label="合計"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((prev) => !prev)}
      >
        <CoinIcon />
      </IconHoverTooltip>

      {open
        ? createPortal(
            <div
              ref={panelRef}
              id={panelId}
              role="dialog"
              aria-modal="true"
              aria-label="料金合計"
              style={{ top: pos.top, left: pos.left }}
              className="fixed z-[60] w-[min(20rem,calc(100vw-1rem))] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">料金合計</p>
                  <p className="mt-0.5 text-xs font-medium text-slate-500">
                    {totals.clinicLabel}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-slate-400">
                    {totals.periodLabel}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  className="!px-2 !py-1 !text-xs"
                  onClick={close}
                >
                  閉じる
                </Button>
              </div>

              <div className="px-4 py-4">
                <p className="text-2xl font-black tracking-tight text-[#008C01]">
                  {totals.totalYen > 0 ? formatYen(totals.totalYen) : '—'}
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                  確定課金と参照概算を合算。表示用に 1 USD = {USD_TO_JPY}{' '}
                  円で換算（実請求の正は Cursor 課金）
                </p>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
