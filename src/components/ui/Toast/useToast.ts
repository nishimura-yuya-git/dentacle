import { useContext } from 'react'
import { ToastContext } from '@/components/ui/Toast/toastContext'

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast は ToastProvider 内で使ってください。')
  }
  return ctx
}
