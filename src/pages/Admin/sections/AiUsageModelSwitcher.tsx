import { useCallback, useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { useToast } from '@/components/ui/Toast'
import {
  COMPOSER_PLATFORM_CURSOR_MODEL_ID,
  PLATFORM_CURSOR_MODEL_OPTIONS,
  isGrokPlatformCursorModelId,
  normalizePlatformCursorModelId,
  type PlatformCursorModelId,
} from '@/config/aiModelOptions'
import { useAuth } from '@/features/auth/useAuth'
import { supabase } from '@/lib/supabase'
import { IconHoverTooltip } from '@/pages/Calendar/components/IconHoverTooltip'
import { useAnchoredPopover } from '@/pages/Calendar/hooks/useAnchoredPopover'
import { AiUsageModelSwitcherMenu } from '@/pages/Admin/sections/AiUsageModelSwitcherMenu'
import { shouldCloseModelSwitcherAfterSave } from '@/pages/Admin/sections/modelSwitcherUx'

const PANEL_WIDTH = 400

function AiModelIcon() {
  return (
    <img
      src="/icon/ai.png"
      alt=""
      width={18}
      height={18}
      className="h-[18px] w-[18px] object-contain opacity-70 brightness-0"
      draggable={false}
    />
  )
}

/** 全院共通 Cursor モデル切替（Grok は版スライダー。保存後もパネルは開いたまま） */
export function AiUsageModelSwitcher() {
  const toast = useToast()
  const { user } = useAuth()
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modelId, setModelId] = useState<PlatformCursorModelId>('grok-4.5')
  const close = useCallback(() => setOpen(false), [])
  const { buttonRef, panelRef, pos } = useAnchoredPopover({
    open,
    onClose: close,
    panelWidth: PANEL_WIDTH,
  })

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('platform_ai_settings')
      .select('cursor_model_id')
      .eq('id', 1)
      .maybeSingle()
    setLoading(false)
    if (error) {
      toast.error(error.message)
      return
    }
    setModelId(normalizePlatformCursorModelId(data?.cursor_model_id))
  }, [toast])

  useEffect(() => {
    if (!open) return
    void load()
  }, [open, load])

  const save = async (next: PlatformCursorModelId) => {
    if (next === modelId || saving) return
    setSaving(true)
    const { error } = await supabase.from('platform_ai_settings').upsert({
      id: 1,
      cursor_model_id: next,
      updated_at: new Date().toISOString(),
      updated_by: user?.id ?? null,
    })
    setSaving(false)
    if (error) {
      toast.error(error.message)
      return
    }
    setModelId(next)
    const label = isGrokPlatformCursorModelId(next)
      ? `Grok ${next.replace('grok-', '')}`
      : (PLATFORM_CURSOR_MODEL_OPTIONS.find((option) => option.id === next)
          ?.label ?? next)
    toast.success(`${label} に切り替えました`)
    if (shouldCloseModelSwitcherAfterSave()) close()
  }

  return (
    <>
      <IconHoverTooltip
        ref={buttonRef}
        label="モデル切替"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((prev) => !prev)}
      >
        <AiModelIcon />
      </IconHoverTooltip>

      {open
        ? createPortal(
            <div
              ref={panelRef}
              id={panelId}
              role="dialog"
              aria-label="モデル切替"
              style={{ top: pos.top, left: pos.left }}
              className="fixed z-[60] w-[min(25rem,calc(100vw-1rem))] overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-2xl"
            >
              <AiUsageModelSwitcherMenu
                loading={loading}
                saving={saving}
                modelId={modelId}
                onSelectGrok={(next) => void save(next)}
                onSelectComposer={() => void save(COMPOSER_PLATFORM_CURSOR_MODEL_ID)}
              />
              <p className="border-t border-slate-100 px-3.5 py-2 text-[10px] font-medium text-slate-400">
                全クリニック共通 ・ 次回の自動提案から反映
              </p>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
