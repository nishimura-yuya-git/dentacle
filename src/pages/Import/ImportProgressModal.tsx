import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import type { ImportProgressStep } from '@/features/patientImport/importPatientCsv'

export const IMPORT_STEPS = ['準備', '担当者', '患者', '訪問条件', '完了'] as const

export type ImportResultSummary = {
  staffUpserted: number
  patientsInserted: number
  patientsUpdated: number
  conditionsUpserted: number
  errors: string[]
}

type Props = {
  open: boolean
  running: boolean
  activeStep: ImportProgressStep
  detail: string
  result: ImportResultSummary | null
  onClose: () => void
}

/** 患者CSV取込の進捗・結果モーダル（取込開始後に表示） */
export function ImportProgressModal({
  open,
  running,
  activeStep,
  detail,
  result,
  onClose,
}: Props) {
  const stepIndex = Math.max(0, IMPORT_STEPS.indexOf(activeStep as (typeof IMPORT_STEPS)[number]))
  const done = !running && activeStep === '完了'

  return (
    <Modal
      isOpen={open}
      title="取込進捗"
      onClose={onClose}
      closeDisabled={running}
      footer={
        <div className="flex justify-end">
          <Button
            variant={done ? 'primary' : 'secondary'}
            disabled={running}
            onClick={onClose}
          >
            {running ? '処理中…' : '閉じる'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <h3 className="text-sm font-bold text-slate-900">進捗</h3>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#008C01] transition-all duration-500"
              style={{
                width: `${done ? 100 : (stepIndex / (IMPORT_STEPS.length - 1)) * 100}%`,
              }}
            />
          </div>
          <div className="mt-4 grid grid-cols-5 gap-2">
            {IMPORT_STEPS.map((step, index) => {
              const active = index === stepIndex && !done
              const completed = done || index < stepIndex
              return (
                <div key={step} className="text-center">
                  <div
                    className={[
                      'mx-auto flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-black',
                      completed
                        ? 'border-[#008C01] bg-[#008C01] text-white'
                        : active
                          ? 'border-[#008C01] bg-white text-[#008C01]'
                          : 'border-slate-200 bg-white text-slate-300',
                    ].join(' ')}
                  >
                    {completed ? '✓' : index + 1}
                  </div>
                  <p
                    className={`mt-1 text-[11px] font-bold ${
                      active || completed ? 'text-slate-900' : 'text-slate-300'
                    }`}
                  >
                    {step}
                  </p>
                </div>
              )
            })}
          </div>
          <p className="mt-4 text-sm font-medium text-slate-500">{detail}</p>
        </div>

        {result ? (
          <div className="space-y-3 border-t border-slate-100 pt-4">
            <h3 className="text-sm font-bold text-slate-900">結果</h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 py-3 text-center text-sm font-bold text-slate-700">
                担当 {result.staffUpserted}
              </div>
              <div className="rounded-2xl bg-emerald-50 py-3 text-center text-sm font-bold text-emerald-700">
                新規 {result.patientsInserted}
              </div>
              <div className="rounded-2xl bg-blue-50 py-3 text-center text-sm font-bold text-blue-700">
                更新 {result.patientsUpdated}
              </div>
              <div className="rounded-2xl bg-amber-50 py-3 text-center text-sm font-bold text-amber-700">
                条件 {result.conditionsUpserted}
              </div>
            </div>
            {result.errors.length > 0 ? (
              <ul className="space-y-1">
                {result.errors.slice(0, 5).map((item) => (
                  <li key={item} className="text-xs font-medium text-rose-600">
                    {item}
                  </li>
                ))}
                {result.errors.length > 5 ? (
                  <li className="text-xs font-medium text-rose-600">
                    他 {result.errors.length - 5} 件
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className="text-sm font-medium text-slate-500">
                取込は種まきまでです。患者カルテで頻度・可能曜日を育ててください。
              </p>
            )}
          </div>
        ) : null}
      </div>
    </Modal>
  )
}
