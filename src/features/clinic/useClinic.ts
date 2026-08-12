import { useContext } from 'react'
import { ClinicContext } from '@/features/clinic/clinicContext'

export function useClinic() {
  const ctx = useContext(ClinicContext)
  if (!ctx) {
    throw new Error('useClinic は ClinicProvider 内で使ってください。')
  }
  return ctx
}
