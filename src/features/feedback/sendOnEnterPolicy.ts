/** ご意見の Enter 送信。既定オフ。localStorage のキーと判定の SSoT */

export const SEND_ON_ENTER_STORAGE_KEY = 'dentacle.feedback.sendOnEnter'
export const SEND_ON_ENTER_LABEL = 'Enterで送信'

export type EnterKeyAction = 'send' | 'newline' | 'ignore'

export function parseSendOnEnterPreference(raw: string | null): boolean {
  return raw === '1' || raw === 'true'
}

export function serializeSendOnEnterPreference(value: boolean): string {
  return value ? '1' : '0'
}

export function sendOnEnterDescription(enabled: boolean): string {
  return enabled ? '改行は Shift + Enter' : '送信は右下のボタン。Enterで改行'
}

export function resolveEnterKeyAction(input: {
  sendOnEnter: boolean
  key: string
  shiftKey: boolean
  isComposing: boolean
  keyCode?: number
  hasDraft: boolean
  busy: boolean
}): EnterKeyAction {
  if (input.key !== 'Enter') return 'ignore'
  if (input.isComposing || input.keyCode === 229) return 'newline'
  if (!input.sendOnEnter) return 'newline'
  if (input.shiftKey) return 'newline'
  if (input.busy || !input.hasDraft) return 'ignore'
  return 'send'
}
