import { Select } from '@/components/ui/Select'
import {
  COMPOSER_PLATFORM_CURSOR_MODEL_ID,
  GROK_VERSION_SELECT_OPTIONS,
  PLATFORM_CURSOR_MODEL_OPTIONS,
  grokVersionValue,
  isGrokPlatformCursorModelId,
  type PlatformCursorModelId,
} from '@/config/aiModelOptions'

function ModelGlyph({ kind }: { kind: 'grok' | 'composer' }) {
  const src = kind === 'composer' ? '/icon/cursor_composer.png' : '/icon/grok.svg'
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

const COMPOSER_OPTION = PLATFORM_CURSOR_MODEL_OPTIONS.find(
  (option) => option.id === COMPOSER_PLATFORM_CURSOR_MODEL_ID,
)

type Props = {
  loading: boolean
  saving: boolean
  modelId: PlatformCursorModelId
  onSelectGrok: (next: PlatformCursorModelId) => void
  onSelectComposer: () => void
}

/** Grok は1行＋版セレクト。Composer は単独行 */
export function AiUsageModelSwitcherMenu({
  loading,
  saving,
  modelId,
  onSelectGrok,
  onSelectComposer,
}: Props) {
  const grokSelected = isGrokPlatformCursorModelId(modelId)
  const grokValue = grokVersionValue(modelId)
  const grokDescription =
    PLATFORM_CURSOR_MODEL_OPTIONS.find((option) => option.id === grokValue)
      ?.description ?? ''
  const composerSelected = modelId === COMPOSER_PLATFORM_CURSOR_MODEL_ID

  if (loading) {
    return <p className="px-4 py-3 text-sm text-slate-400">読み込み中…</p>
  }

  return (
    <>
      <div
        className={[
          'flex w-full items-start gap-3 px-3.5 py-2.5',
          grokSelected ? 'bg-slate-50' : '',
        ].join(' ')}
      >
        <ModelGlyph kind="grok" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-slate-900">Grok</p>
            <div
              className="ml-auto w-[12.5rem]"
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center gap-1.5">
                <label
                  htmlFor="grok-version"
                  className="shrink-0 text-[11px] font-bold text-slate-500"
                >
                  版
                </label>
                <Select
                  id="grok-version"
                  size="sm"
                  className="min-w-0 flex-1"
                  disabled={saving}
                  options={[...GROK_VERSION_SELECT_OPTIONS]}
                  value={grokValue}
                  onChange={(event) => {
                    const next = event.target.value
                    if (isGrokPlatformCursorModelId(next)) onSelectGrok(next)
                  }}
                />
              </div>
            </div>
          </div>
          <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-400">
            {grokDescription}
          </p>
        </div>
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
          {grokSelected ? <CheckGlyph /> : null}
        </span>
      </div>

      {COMPOSER_OPTION ? (
        <button
          type="button"
          disabled={saving}
          aria-pressed={composerSelected}
          onClick={onSelectComposer}
          className={[
            'flex w-full items-start gap-3 px-3.5 py-2.5 text-left transition',
            composerSelected ? 'bg-slate-50' : 'hover:bg-slate-50',
            saving ? 'opacity-60' : '',
          ].join(' ')}
        >
          <ModelGlyph kind="composer" />
          <span className="min-w-0 flex-1">
            <span className="text-sm font-bold text-slate-900">
              {COMPOSER_OPTION.label}
            </span>
            <span className="mt-1 block text-[11px] font-medium leading-relaxed text-slate-400">
              {COMPOSER_OPTION.description}
            </span>
          </span>
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
            {composerSelected ? <CheckGlyph /> : null}
          </span>
        </button>
      ) : null}
    </>
  )
}
