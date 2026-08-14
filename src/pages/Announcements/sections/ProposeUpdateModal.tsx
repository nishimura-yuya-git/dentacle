import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { PreferenceRow } from '@/components/ui/PreferenceRow'
import { Select } from '@/components/ui/Select'
import { TimelineMarkPicker } from '@/pages/Announcements/components/TimelineMarkPicker'
import { defaultProductUpdateMark, type ProductUpdateMark } from '@/pages/Announcements/productUpdateMark'
import type {
  ProductUpdateKind,
  ProductUpdatePlatform,
  ProductUpdateSurface,
} from '@/pages/Announcements/productUpdatePolicy'
import { KIND_OPTIONS, PLATFORM_OPTIONS, SURFACE_OPTIONS } from '@/pages/Announcements/productUpdateTypes'

type Draft = {
  kind: ProductUpdateKind
  title: string
  body: string
  detailUrl: string
  surfaces: ProductUpdateSurface[]
  platform: ProductUpdatePlatform
  showInProgressBadge: boolean
  timelineMark: ProductUpdateMark
}

const EMPTY_DRAFT: Draft = {
  kind: 'feature',
  title: '',
  body: '',
  detailUrl: '',
  surfaces: [],
  platform: 'web',
  showInProgressBadge: true,
  timelineMark: defaultProductUpdateMark('feature'),
}

export function ProposeUpdateModal({
  open,
  title,
  submitLabel,
  titleFieldLabel,
  titleFieldError,
  titleFieldPlaceholder,
  fields,
  submitting,
  onClose,
  onSubmit,
}: {
  open: boolean
  title: string
  submitLabel: string
  titleFieldLabel: string
  titleFieldError: string
  titleFieldPlaceholder?: string
  fields: 'title-only' | 'full'
  submitting: boolean
  onClose: () => void
  onSubmit: (draft: Draft) => Promise<boolean>
}) {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [titleError, setTitleError] = useState<string | undefined>()
  const titleOnly = fields === 'title-only'

  function resetAndClose() {
    setDraft(EMPTY_DRAFT)
    setTitleError(undefined)
    onClose()
  }

  async function handleSubmit() {
    if (draft.title.trim() === '') {
      setTitleError(titleFieldError)
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
      title={title}
      closeDisabled={submitting}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" disabled={submitting} onClick={resetAndClose}>
            キャンセル
          </Button>
          <Button variant="primary" loading={submitting} onClick={() => void handleSubmit()}>
            {submitLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {titleOnly ? null : (
          <>
            <Select
              label="種類"
              options={KIND_OPTIONS}
              value={draft.kind}
              onChange={(event) => {
                const kind = event.target.value as ProductUpdateKind
                setDraft((current) => ({
                  ...current,
                  kind,
                  timelineMark: defaultProductUpdateMark(kind),
                }))
              }}
            />
            <TimelineMarkPicker
              value={draft.timelineMark}
              disabled={submitting}
              onChange={(timelineMark) => setDraft((current) => ({ ...current, timelineMark }))}
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
          </>
        )}
        <Input
          label={titleFieldLabel}
          name="product-update-title"
          value={draft.title}
          error={titleError}
          maxLength={200}
          placeholder={titleFieldPlaceholder}
          onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
        />
        {titleOnly ? (
          <PreferenceRow
            label="開発中"
            description="チップの右上に表示する"
            checked={draft.showInProgressBadge}
            disabled={submitting}
            onChange={(showInProgressBadge) =>
              setDraft((current) => ({ ...current, showInProgressBadge }))
            }
          />
        ) : null}
        {titleOnly ? null : (
          <>
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
          </>
        )}
      </div>
    </Modal>
  )
}
