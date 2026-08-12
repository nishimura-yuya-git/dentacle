import { createContext } from 'react'
import type { ToastTone } from '@/components/ui/Toast/toastTypes'

export type ToastApi = {
  success: (message: string) => void
  error: (message: string) => void
  show: (tone: ToastTone, message: string) => void
  dismiss: (id: string) => void
}

export const ToastContext = createContext<ToastApi | null>(null)
