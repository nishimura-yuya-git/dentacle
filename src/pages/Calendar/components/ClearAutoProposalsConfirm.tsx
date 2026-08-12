import { useCallback, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { useAnchoredPopover } from '@/pages/Calendar/hooks/useAnchoredPopover'

type Props = {
  count: number
  busy?: boolean
  disabled?: boolean
  onConfirm: () => void | Promise<void>
}

const PANEL_WIDTH = 320

/**
 * 提案クリアの確認。window.confirm ではなく、
 * 連絡者リストと同型の近傍ポップオーバーで確認する。
 */
export function ClearAutoProposalsConfirm({
  count,
  busy = false,
  disabled = false,
  onConfirm,
}: Props) {
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
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled || busy || count === 0}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        className={[
          'inline-flex shrink-0 items-center justify-center rounded-full font-bold transition',
          'bg-rose-50 px-3 py-1.5 text-xs text-rose-700',
          'hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-200/60',
          'disabled:cursor-not-allowed disabled:bg-rose-50/60 disabled:text-rose-300',
        ].join(' ')}
        onClick={() => {
          if (count === 0 || disabled || busy) return
          setOpen((prev) => !prev)
        }}
      >
        提案をクリア
        {count > 0 ? `（${count}）` : ''}
      </button>

      {open
        ? createPortal(
            <div
              ref={panelRef}
              id={panelId}
              role="dialog"
              aria-modal="true"
              aria-label="提案クリアの確認"
              style={{ top: pos.top, left: pos.left }}
              className="fixed z-[60] w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-slate-100 bg-white p-4 shadow-2xl"
            >
              <p className="text-sm font-bold text-slate-900">提案をクリア</p>
              <p className="mt-2 text-xs font-medium leading-relaxed text-slate-600">
                この日の自動提案の仮予約 {count}{' '}
                件をクリア（取消）しますか？
              </p>
              <p className="mt-1 text-xs font-medium text-slate-400">
                キャンセルリストに残ります。
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="secondary"
                  className="!px-3 !py-1.5 !text-xs"
                  disabled={busy}
                  onClick={close}
                >
                  やめる
                </Button>
                <Button
                  variant="soft"
                  className="!bg-rose-50 !px-3 !py-1.5 !text-xs !text-rose-700 hover:!bg-rose-100"
                  loading={busy}
                  onClick={() => {
                    void Promise.resolve(onConfirm()).then(() => {
                      setOpen(false)
                    })
                  }}
                >
                  クリアする
                </Button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
