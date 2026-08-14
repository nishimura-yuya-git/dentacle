import type { Json } from '../../types/database.types.ts'

export const VISIT_CELL_COLORS = ['green', 'amber', 'orange', 'sky', 'slate'] as const

export type VisitCellColor = (typeof VISIT_CELL_COLORS)[number]

export const DEFAULT_VISIT_CELL_COLOR: VisitCellColor = 'green'

export const VISIT_CELL_COLOR_OPTIONS: ReadonlyArray<{
  id: VisitCellColor
  label: string
  swatchClass: string
  fillClass: string
  surfaceClass: string
}> = [
  {
    id: 'green',
    label: '緑',
    swatchClass: 'bg-[#E8F5E9] border-[#008C01]/40',
    fillClass: 'bg-[#E8F5E9]',
    surfaceClass: 'border-[#008C01]/30 bg-[#E8F5E9]',
  },
  {
    id: 'amber',
    label: '黄',
    swatchClass: 'bg-amber-50 border-amber-300',
    fillClass: 'bg-amber-50',
    surfaceClass: 'border-amber-200 bg-amber-50',
  },
  {
    id: 'orange',
    label: '橙',
    swatchClass: 'bg-orange-50 border-orange-300',
    fillClass: 'bg-orange-50',
    surfaceClass: 'border-orange-200 bg-orange-50',
  },
  {
    id: 'sky',
    label: '青',
    swatchClass: 'bg-sky-50 border-sky-300',
    fillClass: 'bg-sky-50',
    surfaceClass: 'border-sky-200 bg-sky-50',
  },
  {
    id: 'slate',
    label: '灰',
    swatchClass: 'bg-slate-100 border-slate-300',
    fillClass: 'bg-slate-100',
    surfaceClass: 'border-slate-200 bg-slate-100',
  },
]

function asRecord(value: Json | null | undefined): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

export function isVisitCellColor(value: unknown): value is VisitCellColor {
  return VISIT_CELL_COLORS.includes(value as VisitCellColor)
}

export function readVisitCellColor(metadata: Json | null | undefined): VisitCellColor {
  const raw = asRecord(metadata).cell_color
  return isVisitCellColor(raw) ? raw : DEFAULT_VISIT_CELL_COLOR
}

export function withVisitCellColor(
  metadata: Json | null | undefined,
  color: VisitCellColor,
): Record<string, unknown> {
  return {
    ...asRecord(metadata),
    cell_color: color,
  }
}

export function visitCellColorOption(color: VisitCellColor) {
  return (
    VISIT_CELL_COLOR_OPTIONS.find((option) => option.id === color) ??
    VISIT_CELL_COLOR_OPTIONS[0]
  )
}
