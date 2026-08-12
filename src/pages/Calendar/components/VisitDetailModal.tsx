import type { FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { TimePicker } from '@/components/ui/TimePicker'

type Option = { value: string; label: string }

type Props = {
  open: boolean
  busy: boolean
  patientName: string
  teamId: string
  startTime: string
  endTime: string
  teamOptions: Option[]
  onClose: () => void
  onChangeTeam: (value: string) => void
  onChangeStart: (value: string) => void
  onChangeEnd: (value: string) => void
  onSubmit: (event: FormEvent) => void
  onCancel: () => void
  onCopyNext: () => void
}

export function VisitDetailModal({
  open,
  busy,
  patientName,
  teamId,
  startTime,
  endTime,
  teamOptions,
  onClose,
  onChangeTeam,
  onChangeStart,
  onChangeEnd,
  onSubmit,
  onCancel,
  onCopyNext,
}: Props) {
  return (
    <Modal
      isOpen={open}
      title="訪問の詳細"
      onClose={onClose}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" className="text-rose-600" disabled={busy} onClick={onCancel}>
            取消
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={busy} onClick={onCopyNext}>
              連続で複製
            </Button>
            <Button variant="secondary" onClick={onClose}>
              閉じる
            </Button>
            <Button type="submit" form="move-visit-form" loading={busy}>
              更新する
            </Button>
          </div>
        </div>
      }
    >
      <form id="move-visit-form" onSubmit={onSubmit} className="grid gap-4">
        <p className="text-sm font-medium text-slate-600">{patientName}</p>
        <Select
          label="訪問号車"
          value={teamId}
          onChange={(e) => onChangeTeam(e.target.value)}
          options={teamOptions}
        />
        <TimePicker
          label="開始時刻"
          value={startTime}
          onChange={onChangeStart}
          required
          minuteStep={5}
        />
        <TimePicker
          label="終了時刻"
          value={endTime}
          onChange={onChangeEnd}
          required
          minuteStep={5}
        />
        <p className="text-xs font-medium text-slate-400">
          ブロックをドラッグで移動、下端ハンドルで時間変更もできます。
        </p>
      </form>
    </Modal>
  )
}
