import { ComposingOrb } from '@/components/ui/ComposingOrb'

const LABEL = '提案を作成しています'

/**
 * カレンダーグリッド上の処理中表示。暗い背景は置かない。
 */
export function AiComposingOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-white/70"
      role="status"
      aria-live="polite"
      aria-label={LABEL}
    >
      <div className="flex flex-col items-center gap-3">
        <ComposingOrb size={64} label={LABEL} />
        <p className="text-sm font-bold text-slate-700">{LABEL}</p>
      </div>
    </div>
  )
}
