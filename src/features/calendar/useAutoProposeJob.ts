import { useContext } from 'react'
import { AutoProposeJobContext } from '@/features/calendar/autoProposeJobContext'

export function useAutoProposeJob() {
  const ctx = useContext(AutoProposeJobContext)
  if (!ctx) {
    throw new Error('useAutoProposeJob は AutoProposeJobProvider 内で使ってください。')
  }
  return ctx
}
