export type ToastTone = 'success' | 'error'

export type ToastItem = {
  id: string
  tone: ToastTone
  message: string
}
