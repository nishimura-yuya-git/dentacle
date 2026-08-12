import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/Button'

type ModalSize = 'md' | 'xl'

type Props = {
  isOpen: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  /** md: 通常 / xl: 連絡者リストなど広い表 */
  size?: ModalSize
  /** true のとき背景クリック・ESC・閉じるボタンを無効化（処理中など） */
  closeDisabled?: boolean
}

const SIZE_CLASS: Record<ModalSize, string> = {
  md: 'max-w-2xl',
  xl: 'max-w-6xl',
}

export function Modal({
  isOpen,
  title,
  onClose,
  children,
  footer,
  size = 'md',
  closeDisabled = false,
}: Props) {
  useEffect(() => {
    if (!isOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !closeDisabled) onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [isOpen, onClose, closeDisabled])

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40"
        aria-label="閉じる"
        disabled={closeDisabled}
        onClick={() => {
          if (!closeDisabled) onClose()
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-[32px] border border-slate-100 bg-white shadow-2xl ${SIZE_CLASS[size]}`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-8 py-5">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <Button variant="ghost" disabled={closeDisabled} onClick={onClose}>
            閉じる
          </Button>
        </div>
        <div className="overflow-y-auto px-8 py-6">{children}</div>
        {footer ? (
          <div className="border-t border-slate-100 px-8 py-5">{footer}</div>
        ) : null}
      </div>
    </div>,
    document.body
  )
}
