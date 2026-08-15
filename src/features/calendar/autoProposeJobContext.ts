import { createContext } from 'react'
import type { AutoProposePhase } from '@/features/calendar/autoProposeJob'

export type AutoProposeStartInput = {
  clinicId: string
  targetDate: string
  vehicleTeamIds: string[]
}

export type AutoProposeLastResult = {
  id: number
  clinicId: string
  targetDate: string
  ok: boolean
}

export type AutoProposeJobContextValue = {
  phase: AutoProposePhase
  percent: number
  progressActive: boolean
  clinicId: string | null
  targetDate: string | null
  lastResult: AutoProposeLastResult | null
  start: (input: AutoProposeStartInput) => void
}

export const AutoProposeJobContext = createContext<AutoProposeJobContextValue | null>(
  null,
)
