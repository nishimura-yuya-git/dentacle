import type { Json } from '../../types/database.types'
import {
  VISIT_MENU_CATALOG,
  findVisitMenu,
  formatVisitMenuLabel,
  type VisitMenuItem,
  type VisitMenuSlot,
} from './visitMenuCatalog.ts'

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.slice(0, 5).split(':').map(Number)
  return hours * 60 + minutes
}

function minutesToLabel(total: number): string {
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export type VisitMenuForm = {
  menu_1: string
  menu_2: string
  menu_3: string
  menu_sub: string
}

export type VisitMenuSnapshot = {
  slot: VisitMenuSlot
  code: string
  name_snapshot: string
  duration_minutes_snapshot: number
}

export const EMPTY_VISIT_MENU_FORM: VisitMenuForm = {
  menu_1: '',
  menu_2: '',
  menu_3: '',
  menu_sub: '',
}

function asRecord(value: Json | null | undefined): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

/** 無いキーは ON。false だけ OFF */
export function isVisitMenuEnabled(
  enabled: Record<string, boolean>,
  code: string,
): boolean {
  return enabled[code] !== false
}

export function visitMenuSelectOptions(
  enabled: Record<string, boolean>,
  currentCode = '',
): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = [
    { value: '', label: '指定なし' },
  ]
  for (const item of VISIT_MENU_CATALOG) {
    if (!isVisitMenuEnabled(enabled, item.code) && item.code !== currentCode) {
      continue
    }
    options.push({ value: item.code, label: formatVisitMenuLabel(item) })
  }
  if (currentCode && !options.some((option) => option.value === currentCode)) {
    const item = findVisitMenu(currentCode)
    options.push({
      value: currentCode,
      label: item ? formatVisitMenuLabel(item) : currentCode,
    })
  }
  return options
}

export function enabledVisitMenus(enabled: Record<string, boolean>): VisitMenuItem[] {
  return VISIT_MENU_CATALOG.filter((item) => isVisitMenuEnabled(enabled, item.code))
}

export function endTimeFromStartAndMenu(
  startTime: string,
  menuCode: string,
): string | null {
  const item = findVisitMenu(menuCode)
  if (!item) return null
  return minutesToLabel(timeToMinutes(startTime) + item.durationMinutes)
}

export function applyMenu1EndTime<T extends { start_time: string; end_time: string; menu_1: string }>(
  form: T,
  menuCode: string,
): T {
  const endTime = endTimeFromStartAndMenu(form.start_time, menuCode)
  return {
    ...form,
    menu_1: menuCode,
    end_time: endTime ?? form.end_time,
  }
}

function isVisitMenuSlot(value: unknown): value is VisitMenuSlot {
  return value === '1' || value === '2' || value === '3' || value === 'sub'
}

export function readVisitMenus(metadata: Json | null | undefined): VisitMenuSnapshot[] {
  const raw = asRecord(metadata).visit_menus
  if (!Array.isArray(raw)) return []
  const menus: VisitMenuSnapshot[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue
    const record = row as Record<string, unknown>
    if (!isVisitMenuSlot(record.slot)) continue
    if (typeof record.code !== 'string' || record.code.length === 0) continue
    if (typeof record.name_snapshot !== 'string') continue
    if (typeof record.duration_minutes_snapshot !== 'number') continue
    menus.push({
      slot: record.slot,
      code: record.code,
      name_snapshot: record.name_snapshot,
      duration_minutes_snapshot: record.duration_minutes_snapshot,
    })
  }
  return menus
}

export function visitMenusToForm(menus: VisitMenuSnapshot[]): VisitMenuForm {
  const form = { ...EMPTY_VISIT_MENU_FORM }
  for (const menu of menus) {
    if (menu.slot === '1') form.menu_1 = menu.code
    if (menu.slot === '2') form.menu_2 = menu.code
    if (menu.slot === '3') form.menu_3 = menu.code
    if (menu.slot === 'sub') form.menu_sub = menu.code
  }
  return form
}

export function buildVisitMenuSnapshots(form: VisitMenuForm): VisitMenuSnapshot[] {
  const pairs: Array<[VisitMenuSlot, string]> = [
    ['1', form.menu_1],
    ['2', form.menu_2],
    ['3', form.menu_3],
    ['sub', form.menu_sub],
  ]
  const menus: VisitMenuSnapshot[] = []
  for (const [slot, code] of pairs) {
    if (!code) continue
    const item = findVisitMenu(code)
    if (!item) continue
    menus.push({
      slot,
      code: item.code,
      name_snapshot: item.name,
      duration_minutes_snapshot: item.durationMinutes,
    })
  }
  return menus
}

export function withVisitMenus(
  metadata: Json | null | undefined,
  menus: VisitMenuSnapshot[],
): Record<string, unknown> {
  return {
    ...asRecord(metadata),
    visit_menus: menus,
  }
}

export function resolveManualVisitEndTime(
  form: VisitMenuForm & { start_time: string; end_time: string },
  fallbackEndTime: string,
): string {
  const fromMenu = endTimeFromStartAndMenu(form.start_time, form.menu_1)
  if (fromMenu) return fromMenu
  return fallbackEndTime
}
