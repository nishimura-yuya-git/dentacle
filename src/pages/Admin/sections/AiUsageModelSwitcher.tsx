import { useCallback, useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { useToast } from '@/components/ui/Toast'
import {
  PLATFORM_CURSOR_MODEL_OPTIONS,
  normalizePlatformCursorModelId,
  type PlatformCursorModelId,
} from '@/config/aiModelOptions'
import { useAuth } from '@/features/auth/useAuth'
import { supabase } from '@/lib/supabase'
import { IconHoverTooltip } from '@/pages/Calendar/components/IconHoverTooltip'
import { useAnchoredPopover } from '@/pages/Calendar/hooks/useAnchoredPopover'

const PANEL_WIDTH = 380

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

function ModelGlyph({ kind }: { kind: PlatformCursorModelId }) {
  const src =
    kind === 'composer-2.5' ? '/icon/cursor_composer.png' : '/icon/grok.svg'
  return (
    <img
      src={src}
      alt=""
      width={32}
      height={32}
      className="mt-0.5 h-8 w-8 shrink-0 object-contain"
      draggable={false}
    />
  )
}

function CheckGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-slate-500" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.5 8.5 6.5 11.5 12.5 4.5"
      />
    </svg>
  )
}

/** 全院共通 Cursor モデル切替（白背景メニュー形式の近傍ポップオーバー） */
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
    const label =
      PLATFORM_CURSOR_MODEL_OPTIONS.find((option) => option.id === next)
        ?.label ?? next
    toast.success(`${label} に切り替えました`)
    close()
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
              role="listbox"
              aria-label="Cursor モデル切替"
              style={{ top: pos.top, left: pos.left }}
              className="fixed z-[60] w-[min(23.75rem,calc(100vw-1rem))] overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-2xl"
            >
              {loading ? (
                <p className="px-4 py-3 text-sm text-slate-400">読み込み中…</p>
              ) : (
                PLATFORM_CURSOR_MODEL_OPTIONS.map((option) => {
                  const selected = option.id === modelId
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      disabled={saving}
                      onClick={() => void save(option.id)}
                      className={[
                        'flex w-full items-start gap-3 px-3.5 py-2.5 text-left transition',
                        selected ? 'bg-slate-50' : 'hover:bg-slate-50',
                        saving ? 'opacity-60' : '',
                      ].join(' ')}
                    >
                      <ModelGlyph kind={option.id} />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">
                            {option.label}
                          </span>
                          {option.recommended ? (
                            <span className="rounded-full bg-[#3B82F6] px-2 py-0.5 text-[10px] font-bold text-white">
                              おすすめ
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-1 block text-[11px] font-medium leading-relaxed text-slate-400">
                          {option.description}
                        </span>
                      </span>
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                        {selected ? <CheckGlyph /> : null}
                      </span>
                    </button>
                  )
                })
              )}
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
