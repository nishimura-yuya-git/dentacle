import type { FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { TimePicker } from '@/components/ui/TimePicker'

export type VisitCreateForm = {
  patient_id: string
  team_id: string
  staff_id: string
  start_time: string
  end_time: string
  mode: 'visit' | 'block'
  block_type: string
  block_title: string
}

type Option = { value: string; label: string }

type Props = {
  open: boolean
  busy: boolean
  date: string
  form: VisitCreateForm
  patientOptions: Option[]
  teamOptions: Option[]
  staffOptions: Option[]
  onClose: () => void
  onChange: (next: VisitCreateForm) => void
  onSubmit: (event: FormEvent) => void
}

export function VisitCreateModal({
  open,
  busy,
  date,
  form,
  patientOptions,
  teamOptions,
  staffOptions,
  onClose,
  onChange,
  onSubmit,
}: Props) {
  return (
    <Modal
      isOpen={open}
      title={form.mode === 'block' ? '空きブロックを登録' : '訪問を手動登録'}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            キャンセル
          </Button>
          <Button type="submit" form="create-visit-form" loading={busy}>
            登録する
          </Button>
        </div>
      }
    >
      <form id="create-visit-form" onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <Select
            label="登録種別"
            value={form.mode}
            onChange={(e) =>
              onChange({ ...form, mode: e.target.value === 'block' ? 'block' : 'visit' })
            }
            options={[
              { value: 'visit', label: '訪問（患者）' },
              { value: 'block', label: '空きブロック（休憩・移動など）' },
            ]}
          />
        </div>
        {form.mode === 'visit' ? (
          <div className="md:col-span-2">
            <Select
              label="患者"
              value={form.patient_id}
              onChange={(e) => onChange({ ...form, patient_id: e.target.value })}
              options={patientOptions}
              required
            />
          </div>
        ) : (
          <>
            <Select
              label="ブロック種別"
              value={form.block_type}
              onChange={(e) => onChange({ ...form, block_type: e.target.value })}
              options={[
                { value: 'break', label: '休憩' },
                { value: 'travel', label: '移動' },
                { value: 'meeting', label: '会議' },
                { value: 'other', label: 'その他' },
              ]}
            />
            <Input
              label="タイトル"
              value={form.block_title}
              onChange={(e) => onChange({ ...form, block_title: e.target.value })}
              placeholder="例: 昼休憩"
            />
          </>
        )}
        <Select
          label="訪問号車"
          value={form.team_id}
          onChange={(e) => onChange({ ...form, team_id: e.target.value })}
          options={teamOptions}
        />
        {form.mode === 'visit' ? (
          <Select
            label="担当スタッフ"
            value={form.staff_id}
            onChange={(e) => onChange({ ...form, staff_id: e.target.value })}
            options={staffOptions}
          />
        ) : (
          <div />
        )}
        <TimePicker
          label="開始時刻"
          value={form.start_time}
          onChange={(next) => onChange({ ...form, start_time: next })}
          required
          minuteStep={5}
        />
        <TimePicker
          label="終了時刻"
          value={form.end_time}
          onChange={(next) => onChange({ ...form, end_time: next })}
          required
          minuteStep={5}
        />
        <p className="md:col-span-2 text-xs font-medium text-slate-400">
          {form.mode === 'visit'
            ? `仮予約で登録し、電話確認が必要な場合はキューに載せます（日付: ${date}）`
            : `患者のいない枠として登録します（日付: ${date}）`}
        </p>
      </form>
    </Modal>
  )
}
