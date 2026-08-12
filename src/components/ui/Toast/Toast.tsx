import type { ToastItem } from '@/components/ui/Toast/toastTypes'

const TONE_CLASS: Record<ToastItem['tone'], string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  error: 'border-rose-200 bg-rose-50 text-rose-700',
}

type Props = {
  item: ToastItem
  onDismiss: (id: string) => void
}

/** 右上通知1件（見本: 薄緑・緑枠・丸角） */
export function Toast({ item, onDismiss }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto flex max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-medium shadow-sm ${TONE_CLASS[item.tone]}`}
    >
      <p className="min-w-0 flex-1 break-words">{item.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        className="shrink-0 rounded-lg px-1.5 py-0.5 text-xs font-bold opacity-70 transition hover:opacity-100"
        aria-label="通知を閉じる"
      >
        ×
      </button>
    </div>
  )
}
