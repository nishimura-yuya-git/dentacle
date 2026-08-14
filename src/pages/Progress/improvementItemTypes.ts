import type { Tables } from '@/types/database.types'
import type { ImprovementStatus } from '@/pages/Progress/improvementItemPolicy'

export type ImprovementItemRow = Tables<'improvement_items'>

export type ImprovementItemView = {
  id: string
  status: ImprovementStatus
  title: string
  summary: string | null
  pagePath: string | null
  clinicId: string | null
  clinicName: string | null
  githubIssueNumber: number | null
  githubIssueUrl: string | null
  productUpdateId: string | null
  createdAt: string
}
