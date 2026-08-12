import { useEffect, useId, useRef, useState } from 'react'
import type { Clinic } from '@/features/clinic/clinicContext'

type Props = {
  clinic: Clinic | null
  clinics: Clinic[]
  onSelect: (clinicId: string) => void
  /** true のときだけ切替ドロップダウンを出す（運営のみ） */
  allowSwitch?: boolean
}

/** ピル左部のクリニック名。allowSwitch 時のみ一覧を開く */
export function ClinicSwitcher({ clinic, clinics, onSelect, allowSwitch = false }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const canSwitch = allowSwitch && clinics.length > 0

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

  if (!clinic && clinics.length === 0) return null

  const label = clinic?.name ?? 'クリニック未選択'

  return (
    <div ref={rootRef} className={['relative min-w-0', open ? 'z-50' : ''].join(' ')}>
      <button
        type="button"
        className="inline-flex max-w-[min(100vw-10rem,300px)] items-center rounded-l-full px-4 py-1.5 text-left text-sm font-medium text-slate-800 transition hover:bg-slate-50 disabled:hover:bg-white"
        aria-label={canSwitch ? 'クリニックを切り替え' : 'クリニック'}
        aria-haspopup={canSwitch ? 'listbox' : undefined}
        aria-expanded={canSwitch ? open : undefined}
        aria-controls={canSwitch ? listId : undefined}
        disabled={!canSwitch}
        onClick={() => {
          if (canSwitch) setOpen((current) => !current)
        }}
      >
        <span className="truncate">{label}</span>
        {canSwitch ? (
          <span className="ml-1.5 shrink-0 text-[10px] text-slate-400" aria-hidden>
            ▼
          </span>
        ) : null}
      </button>

      {open && canSwitch ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="クリニック一覧"
          className="absolute right-0 top-full z-50 mt-2 min-w-full max-w-[min(100vw-2rem,360px)] rounded-2xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {clinics.map((item) => {
            const selected = item.id === clinic?.id
            return (
              <li key={item.id} role="option" aria-selected={selected}>
                <button
                  type="button"
                  className={[
                    'flex w-full items-center px-4 py-2.5 text-left text-sm font-medium transition',
                    selected
                      ? 'bg-[#008C01]/10 font-bold text-[#008C01]'
                      : 'text-slate-700 hover:bg-slate-50',
                  ].join(' ')}
                  onClick={() => {
                    onSelect(item.id)
                    setOpen(false)
                  }}
                >
                  <span className="truncate">{item.name}</span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
