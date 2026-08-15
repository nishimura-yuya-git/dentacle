/** カレンダー自動提案の実行寿命・右上表示・注釈の文言と判定。割付本体は持たない。 */

export const AUTO_PROPOSE_NOTE =
  '※ 他の画面に移っても、自動提案の処理はそのまま進みます。'

export const AUTO_PROPOSE_STATUS_RUNNING = 'ルート最適化提案中'
export const AUTO_PROPOSE_STATUS_DONE = 'ルート最適化提案が完了しました'
export const AUTO_PROPOSE_STATUS_FAILED = 'ルート最適化提案を完了できませんでした'

/** 完了／失敗の右上表示を残す時間 */
export const AUTO_PROPOSE_STATUS_HOLD_MS = 10_000

export type AutoProposePhase = 'idle' | 'running' | 'success' | 'error'

export function autoProposeStatusLabel(phase: AutoProposePhase): string | null {
  if (phase === 'running') return AUTO_PROPOSE_STATUS_RUNNING
  if (phase === 'success') return AUTO_PROPOSE_STATUS_DONE
  if (phase === 'error') return AUTO_PROPOSE_STATUS_FAILED
  return null
}

export function isAutoProposeRunning(phase: AutoProposePhase): boolean {
  return phase === 'running'
}

export function shouldShowCalendarProposeOverlay(input: {
  phase: AutoProposePhase
  jobClinicId: string | null
  viewingClinicId: string | undefined
  jobTargetDate: string | null
  viewingDate: string
}): boolean {
  return (
    input.phase === 'running' &&
    Boolean(input.viewingClinicId) &&
    input.jobClinicId === input.viewingClinicId &&
    input.jobTargetDate === input.viewingDate
  )
}

export function shouldReloadCalendarAfterPropose(input: {
  resultClinicId: string
  resultTargetDate: string
  viewingClinicId: string | undefined
  viewingDate: string
}): boolean {
  return (
    Boolean(input.viewingClinicId) &&
    input.resultClinicId === input.viewingClinicId &&
    input.resultTargetDate === input.viewingDate
  )
}

export function formatAutoProposeSuccessToast(result: {
  adoptedCount: number
  generatedCount: number
}): string {
  return `仮予約を${result.adoptedCount}件登録しました（提案${result.generatedCount}件）`
}

export function formatAutoProposeErrorToast(message: string): string {
  const hint =
    message.includes('割付対象') || message.includes('0件')
      ? ' 「空きを埋める」から個別枠を探せます。'
      : ''
  return `${message}${hint}`
}
