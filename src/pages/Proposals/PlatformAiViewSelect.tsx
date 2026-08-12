import { useEffect, useId, useRef, useState } from 'react'

export type PlatformAiView = 'proposals' | 'usage'

const OPTIONS: { value: PlatformAiView; label: string }[] = [
  { value: 'proposals', label: '自動提案' },
  { value: 'usage', label: 'AI利用状況' },
]

type Props = {
  value: PlatformAiView
  onChange: (view: PlatformAiView) => void
}

/**
 * ヘッダーのクリニックピルと同型の丸ピル＋▼で、
 * 自動提案 / AI利用状況を切り替える。
 */
export function PlatformAiViewSelect({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const label = OPTIONS.find((option) => option.value === value)?.label ?? '自動提案'

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className={['relative inline-flex', open ? 'z-50' : ''].join(' ')}>
      <div className="inline-flex items-stretch rounded-full border border-slate-700 bg-white">
        <button
          type="button"
          className="inline-flex max-w-[min(100vw-10rem,240px)] items-center rounded-full px-4 py-1.5 text-left text-sm font-medium text-slate-800 transition hover:bg-slate-50"
          aria-label="画面を切り替え"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((current) => !current)}
        >
          <span className="truncate">{label}</span>
          <span className="ml-1.5 shrink-0 text-[10px] text-slate-400" aria-hidden>
            ▼
          </span>
        </button>
      </div>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="画面一覧"
          className="absolute left-0 top-full z-50 mt-2 min-w-full rounded-2xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {OPTIONS.map((option) => {
            const selected = option.value === value
            return (
              <li key={option.value} role="option" aria-selected={selected}>
                <button
                  type="button"
                  className={[
                    'flex w-full items-center px-4 py-2.5 text-left text-sm font-medium transition',
                    selected
                      ? 'bg-[#008C01]/10 font-bold text-[#008C01]'
                      : 'text-slate-700 hover:bg-slate-50',
                  ].join(' ')}
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                >
                  <span className="truncate">{option.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
