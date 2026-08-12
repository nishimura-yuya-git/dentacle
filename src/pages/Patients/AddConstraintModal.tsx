import { FormEvent, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { DatePicker } from '@/components/ui/DatePicker'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { WEEKDAY_LABELS } from '@/utils/roleLabels'

const CONSTRAINT_TYPE_OPTIONS = [
  { value: 'ng', label: 'NG' },
  { value: 'unavailable', label: '不可' },
  { value: 'available', label: '可' },
]

type Props = {
  isOpen: boolean
  busy: boolean
  onClose: () => void
  onSubmit: (payload: {
    constraint_type: string
    day_of_week: number | null
    specific_date: string | null
    note: string | null
  }) => Promise<void>
}

export function AddConstraintModal({ isOpen, busy, onClose, onSubmit }: Props) {
  const [form, setForm] = useState({
    constraint_type: 'ng',
    mode: 'weekday' as 'weekday' | 'date',
    day_of_week: '1',
    specific_date: '',
    note: '',
  })

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    await onSubmit({
      constraint_type: form.constraint_type,
      day_of_week: form.mode === 'weekday' ? Number(form.day_of_week) : null,
      specific_date: form.mode === 'date' ? form.specific_date : null,
      note: form.note.trim() || null,
    })
    setForm({
      constraint_type: 'ng',
      mode: 'weekday',
      day_of_week: '1',
      specific_date: '',
      note: '',
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      title="制約を追加"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            キャンセル
          </Button>
          <Button type="submit" form="add-constraint-form" loading={busy}>
            追加する
          </Button>
        </div>
      }
    >
      <form id="add-constraint-form" onSubmit={handleSubmit} className="grid gap-4">
        <Select
          label="種別"
          value={form.constraint_type}
          onChange={(e) => setForm((f) => ({ ...f, constraint_type: e.target.value }))}
          options={CONSTRAINT_TYPE_OPTIONS}
        />
        <Select
          label="指定方法"
          value={form.mode}
          onChange={(e) =>
            setForm((f) => ({ ...f, mode: e.target.value as 'weekday' | 'date' }))
          }
          options={[
            { value: 'weekday', label: '曜日' },
            { value: 'date', label: '特定日' },
          ]}
        />
        {form.mode === 'weekday' ? (
          <Select
            label="曜日"
            value={form.day_of_week}
            onChange={(e) => setForm((f) => ({ ...f, day_of_week: e.target.value }))}
            options={WEEKDAY_LABELS.map((label, day) => ({
              value: String(day),
              label,
            }))}
          />
        ) : (
          <DatePicker
            label="日付"
            value={form.specific_date}
            onChange={(next) => setForm((f) => ({ ...f, specific_date: next }))}
            required
          />
        )}
        <Input
          label="メモ（任意）"
          value={form.note}
          onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
        />
      </form>
    </Modal>
  )
}
