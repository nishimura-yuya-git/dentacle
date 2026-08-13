import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { KIND_OPTIONS, PLATFORM_OPTIONS, SURFACE_OPTIONS } from '@/pages/Announcements/productUpdateTypes'
import type {
  ProductUpdateKind,
  ProductUpdatePlatform,
  ProductUpdateSurface,
} from '@/pages/Announcements/productUpdatePolicy'

type Draft = {
  kind: ProductUpdateKind
  title: string
  body: string
  detailUrl: string
  surfaces: ProductUpdateSurface[]
  platform: ProductUpdatePlatform
}

const EMPTY_DRAFT: Draft = {
  kind: 'feature',
  title: '',
  body: '',
  detailUrl: '',
  surfaces: [],
  platform: 'web',
}

export function ProposeUpdateModal({
  open,
  submitting,
  onClose,
  onSubmit,
}: {
  open: boolean
  submitting: boolean
  onClose: () => void
  onSubmit: (draft: Draft) => Promise<boolean>
}) {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [titleError, setTitleError] = useState<string | undefined>()

  function resetAndClose() {
    setDraft(EMPTY_DRAFT)
    setTitleError(undefined)
    onClose()
  }

  async function handleSubmit() {
    if (draft.title.trim() === '') {
      setTitleError('見出しを入力してください。')
      return
    }
    setTitleError(undefined)
    const ok = await onSubmit(draft)
    if (ok) {
      setDraft(EMPTY_DRAFT)
      onClose()
    }
  }

  function toggleSurface(surface: ProductUpdateSurface) {
    setDraft((current) => {
      const has = current.surfaces.includes(surface)
      return {
        ...current,
        surfaces: has
          ? current.surfaces.filter((item) => item !== surface)
          : [...current.surfaces, surface],
      }
    })
  }

  return (
    <Modal
      isOpen={open}
      onClose={resetAndClose}
      title="更新を提案する"
      closeDisabled={submitting}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" disabled={submitting} onClick={resetAndClose}>
            キャンセル
          </Button>
          <Button variant="primary" loading={submitting} onClick={() => void handleSubmit()}>
            提案する
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <p className="text-sm font-medium leading-relaxed text-slate-500">
          提案しただけではお知らせに出ません。一覧の「入れる」を押したときだけ公開されます。
        </p>
        <Select
          label="種類"
          options={KIND_OPTIONS}
          value={draft.kind}
          onChange={(event) =>
            setDraft((current) => ({ ...current, kind: event.target.value as ProductUpdateKind }))
          }
        />
        <Select
          label="対象環境"
          options={PLATFORM_OPTIONS}
          value={draft.platform}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              platform: event.target.value as ProductUpdatePlatform,
            }))
          }
        />
        <Input
          label="見出し"
          name="product-update-title"
          value={draft.title}
          error={titleError}
          maxLength={200}
          placeholder="現場で何ができるようになったか"
          onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
        />
        <div className="space-y-2">
          <label htmlFor="product-update-body" className="block text-sm font-bold text-slate-800">
            本文（任意）
          </label>
          <textarea
            id="product-update-body"
            value={draft.body}
            maxLength={2000}
            rows={4}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#008C01] focus:ring-4 focus:ring-[#008C01]/20"
            onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))}
          />
        </div>
        <Input
          label="詳しく見るURL（任意）"
          name="product-update-url"
          value={draft.detailUrl}
          placeholder="/calendar または https://"
          onChange={(event) => setDraft((current) => ({ ...current, detailUrl: event.target.value }))}
        />
        <fieldset>
          <legend className="text-sm font-bold text-slate-800">対象（任意）</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {SURFACE_OPTIONS.map((option) => {
              const pressed = draft.surfaces.includes(option.value)
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={pressed}
                  className={[
                    'rounded-xl px-3 py-2 text-sm font-bold transition',
                    pressed
                      ? 'bg-[#008C01] text-white'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                  ].join(' ')}
                  onClick={() => toggleSurface(option.value)}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </fieldset>
      </div>
    </Modal>
  )
}
