import { useCallback, useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/Button'
import {
  FixedHoverTip,
  ICON_HOVER_BUTTON_CLASS,
  useFixedHoverTip,
} from '@/pages/Calendar/components/IconHoverTooltip'
import { NoteIcon } from '@/pages/Calendar/components/NoteIcon'
import { useAnchoredPopover } from '@/pages/Calendar/hooks/useAnchoredPopover'

type Props = {
  value: string
  saving?: boolean
  onSave: (body: string) => boolean | void | Promise<boolean | void>
}

/** 日別メモ（ノートアイコン → 近傍ポップオーバーで入力・登録） */
export function CalendarDayMemo({ value, saving, onSave }: Props) {
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  const hasMemo = value.trim().length > 0
  const close = useCallback(() => setOpen(false), [])
  const { buttonRef, panelRef, pos } = useAnchoredPopover({
    open,
    onClose: close,
    panelWidth: 320,
  })
  const tipLabel = hasMemo ? '日別メモを編集' : '日別メモ'
  const { tipPos, showTip, hideTip } = useFixedHoverTip(buttonRef, !open)

  useEffect(() => {
    if (!open) return
    setDraft(value)
  }, [open, value])

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        onMouseEnter={showTip}
        onMouseLeave={hideTip}
        onFocus={showTip}
        onBlur={hideTip}
        aria-label={hasMemo ? '日別メモを編集' : '日別メモを入力'}
        aria-expanded={open}
        aria-controls={panelId}
        className={ICON_HOVER_BUTTON_CLASS}
      >
        <NoteIcon />
        {hasMemo ? (
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[#008C01]" />
        ) : null}
      </button>
      <FixedHoverTip label={tipLabel} pos={tipPos} />

      {open
        ? createPortal(
            <div
              ref={panelRef}
              id={panelId}
              role="dialog"
              aria-modal="true"
              aria-label="日別メモ"
              style={{ top: pos.top, left: pos.left }}
              className="fixed z-[60] w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-slate-100 bg-white p-4 shadow-2xl"
            >
              <p className="text-sm font-bold text-slate-900">日別メモ</p>
              <p className="mt-1 text-xs font-medium text-slate-400">
                当日の共有事項を入力して登録します
              </p>
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={4}
                placeholder="当日の共有事項"
                className="mt-3 w-full resize-none rounded-xl border border-amber-100 bg-[#FFF8E7] px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#008C01] focus:ring-2 focus:ring-[#008C01]/20"
              />
              <div className="mt-3 flex justify-end gap-2">
                <Button
                  variant="secondary"
                  className="!px-3 !py-1.5 !text-xs"
                  disabled={saving}
                  onClick={close}
                >
                  閉じる
                </Button>
                <Button
                  variant="primary"
                  className="!px-3 !py-1.5 !text-xs"
                  loading={saving}
                  onClick={() => {
                    void Promise.resolve(onSave(draft)).then((ok) => {
                      if (ok === false) return
                      setOpen(false)
                    })
                  }}
                >
                  登録する
                </Button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
