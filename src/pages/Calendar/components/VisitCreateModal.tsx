import type { FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Select } from '@/components/ui/Select'
import { TimePicker } from '@/components/ui/TimePicker'
import { VisitCellColorField } from '@/pages/Calendar/components/VisitCellColorField'
import { VisitMenuFields } from '@/pages/Calendar/components/VisitMenuFields'
import type { VisitBookingStatus } from '@/pages/Calendar/utils/visitCreateBooking'
import {
  DEFAULT_VISIT_CELL_COLOR,
  type VisitCellColor,
} from '@/utils/visitMenus/visitCellColor'
import {
  VISIT_MENU_CATALOG,
  type VisitMenuItem,
} from '@/utils/visitMenus/visitMenuCatalog'
import {
  applyMenu1EndTime,
  EMPTY_VISIT_MENU_FORM,
  type VisitMenuForm,
} from '@/utils/visitMenus/visitMenuState'

export type VisitCreateForm = {
  patient_id: string
  team_id: string
  staff_id: string
  start_time: string
  end_time: string
  mode: 'visit' | 'block'
  booking_status: VisitBookingStatus
  block_type: string
  block_title: string
  cell_color: VisitCellColor
} & VisitMenuForm

export const EMPTY_VISIT_CREATE_FORM: VisitCreateForm = {
  patient_id: '',
  team_id: '',
  staff_id: '',
  start_time: '09:00',
  end_time: '09:30',
  mode: 'visit',
  booking_status: 'tentative',
  block_type: 'break',
  block_title: '',
  cell_color: DEFAULT_VISIT_CELL_COLOR,
  ...EMPTY_VISIT_MENU_FORM,
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
  menuEnabled: Record<string, boolean>
  menuCatalog?: readonly VisitMenuItem[]
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
  menuEnabled,
  menuCatalog = VISIT_MENU_CATALOG,
  onClose,
  onChange,
  onSubmit,
}: Props) {
  return (
    <Modal
      isOpen={open}
      title={form.mode === 'block' ? '斜線ブロックを登録' : '訪問を手動登録'}
      size="lg"
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
              { value: 'block', label: '斜線ブロック（休憩・移動など）' },
            ]}
          />
        </div>
        {form.mode === 'visit' ? (
          <div className="md:col-span-2 space-y-4">
            <Select
              label="患者"
              value={form.patient_id}
              onChange={(e) => onChange({ ...form, patient_id: e.target.value })}
              options={patientOptions}
              required
            />
            <div>
              <p className="mb-2 text-sm font-bold text-slate-800">予約の状態</p>
              <SegmentedControl
                ariaLabel="予約の状態"
                tone="choice"
                value={form.booking_status}
                onChange={(booking_status) => onChange({ ...form, booking_status })}
                options={[
                  { value: 'tentative', label: '仮予約' },
                  { value: 'confirmed', label: '本予約（確定）' },
                ]}
              />
            </div>
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
            <div className="md:col-span-2">
              <p className="mb-2 text-sm font-bold text-slate-800">見え方</p>
              <div
                className="calendar-hatch-fill h-12 rounded-xl border border-slate-300/80"
                aria-hidden
              />
              <p className="mt-2 text-xs font-medium text-slate-400">
                カレンダー上は斜線のブロックになります。患者の訪問ではありません。
              </p>
            </div>
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
          onChange={(next) => {
            const patched = { ...form, start_time: next }
            onChange(
              form.menu_1
                ? applyMenu1EndTime(patched, form.menu_1, menuCatalog)
                : patched,
            )
          }}
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
        {form.mode === 'visit' ? (
          <div className="md:col-span-2">
            <VisitMenuFields
              value={form}
              enabled={menuEnabled}
              catalog={menuCatalog}
              onChange={(menus) => {
                const patched = { ...form, ...menus }
                onChange(
                  menus.menu_1 !== form.menu_1
                    ? applyMenu1EndTime(patched, menus.menu_1, menuCatalog)
                    : patched,
                )
              }}
            />
            <div className="mt-4">
              <VisitCellColorField
                value={form.cell_color}
                onChange={(cell_color) => onChange({ ...form, cell_color })}
              />
            </div>
          </div>
        ) : null}
        <p className="md:col-span-2 text-xs font-medium text-slate-400">
          {form.mode === 'visit'
            ? form.booking_status === 'confirmed'
              ? `この時間で本予約として残します。自動提案はこの時間を空けて他の人で埋めます（日付: ${date}）`
              : `仮予約で登録し、電話確認が必要な場合はキューに載せます（日付: ${date}）`
            : `斜線の空きブロックとして登録します（日付: ${date}）`}
        </p>
      </form>
    </Modal>
  )
}
