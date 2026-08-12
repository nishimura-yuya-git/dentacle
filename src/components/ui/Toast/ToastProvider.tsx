import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Toast } from '@/components/ui/Toast/Toast'
import { ToastContext, type ToastApi } from '@/components/ui/Toast/toastContext'
import type { ToastItem, ToastTone } from '@/components/ui/Toast/toastTypes'

const AUTO_DISMISS_MS = 3500
const MAX_VISIBLE = 4

function nextId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const timersRef = useRef<Map<string, number>>(new Map())

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id)
    if (timer != null) {
      window.clearTimeout(timer)
      timersRef.current.delete(id)
    }
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const show = useCallback(
    (tone: ToastTone, message: string) => {
      const text = message.trim()
      if (!text) return
      const id = nextId()
      setItems((prev) => {
        const next = [...prev, { id, tone, message: text }]
        return next.length > MAX_VISIBLE ? next.slice(-MAX_VISIBLE) : next
      })
      const timer = window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
      timersRef.current.set(id, timer)
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => show('success', message),
      error: (message) => show('error', message),
      show,
      dismiss,
    }),
    [show, dismiss],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      {typeof document !== 'undefined'
        ? createPortal(
            <div
              className="pointer-events-none fixed right-4 top-4 z-[60] flex w-[min(100vw-2rem,24rem)] flex-col gap-2"
              aria-label="通知"
            >
              {items.map((item) => (
                <Toast key={item.id} item={item} onDismiss={dismiss} />
              ))}
            </div>,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  )
}
