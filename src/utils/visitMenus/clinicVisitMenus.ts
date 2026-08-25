import type { Json } from '../../types/database.types.ts'
import { readVisitMenuEnabled } from '../clinic/clinicMetadata.ts'
import { VISIT_MENU_CATALOG, type VisitMenuItem } from './visitMenuCatalog.ts'

function isEnabled(enabled: Record<string, boolean>, code: string): boolean {
  return enabled[code] !== false
}

export type ClinicVisitMenu = VisitMenuItem & {
  id: string
  isEnabled: boolean
  sortOrder: number
}

type ClinicVisitMenuRow = {
  id: string
  code: string
  name: string
  duration_minutes: number
  is_enabled: boolean
  sort_order: number
}

export const MENU_DURATION_MIN = 1
export const MENU_DURATION_MAX = 480

export function shouldSeedClinicVisitMenus(existingCountIncludingDeleted: number): boolean {
  return existingCountIncludingDeleted === 0
}

export function normalizeMenuName(raw: string): string {
  return raw.trim()
}

export function parseDurationMinutes(raw: string): number | null {
  const trimmed = raw.trim()
  if (!/^\d+$/.test(trimmed)) return null
  const value = Number(trimmed)
  if (value < MENU_DURATION_MIN || value > MENU_DURATION_MAX) return null
  return value
}

export function createCustomMenuCode(randomId = crypto.randomUUID()): string {
  return `custom-${randomId}`
}

export function enabledMapFromMenus(
  items: Array<{ code: string; isEnabled: boolean }>,
): Record<string, boolean> {
  const enabled: Record<string, boolean> = {}
  for (const item of items) {
    if (!item.isEnabled) enabled[item.code] = false
  }
  return enabled
}

export function fallbackClinicVisitMenus(
  metadata: Json | null | undefined,
): ClinicVisitMenu[] {
  const enabled = readVisitMenuEnabled(metadata)
  return VISIT_MENU_CATALOG.map((item, index) => ({
    id: item.code,
    code: item.code,
    name: item.name,
    durationMinutes: item.durationMinutes,
    isEnabled: isEnabled(enabled, item.code),
    sortOrder: index,
  }))
}

export function mapClinicVisitMenuRows(rows: ClinicVisitMenuRow[]): ClinicVisitMenu[] {
  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    durationMinutes: row.duration_minutes,
    isEnabled: row.is_enabled,
    sortOrder: row.sort_order,
  }))
}

export function buildClinicVisitMenuSeedInserts(input: {
  clinicId: string
  metadata: Json | null | undefined
  userId: string | null
}): Array<{
  clinic_id: string
  code: string
  name: string
  duration_minutes: number
  is_enabled: boolean
  sort_order: number
  created_by: string | null
  updated_by: string | null
}> {
  const enabled = readVisitMenuEnabled(input.metadata)
  return VISIT_MENU_CATALOG.map((item, index) => ({
    clinic_id: input.clinicId,
    code: item.code,
    name: item.name,
    duration_minutes: item.durationMinutes,
    is_enabled: isEnabled(enabled, item.code),
    sort_order: index,
    created_by: input.userId,
    updated_by: input.userId,
  }))
}

const MENU_SELECT =
  'id, code, name, duration_minutes, is_enabled, sort_order' as const

async function selectActiveMenus(clinicId: string): Promise<{
  items: ClinicVisitMenu[]
  error: string | null
}> {
  const { supabase } = await import('../../lib/supabase.ts')
  const { data, error } = await supabase
    .from('clinic_visit_menus')
    .select(MENU_SELECT)
    .eq('clinic_id', clinicId)
    .is('deleted_at', null)
    .order('sort_order')
    .order('name')
  if (error) return { items: [], error: error.message }
  return { items: mapClinicVisitMenuRows(data ?? []), error: null }
}

/** 院メニューを読む。未コピーなら初期29件を入れる。書けない場合はコードカタログに倒す */
export async function ensureClinicVisitMenus(input: {
  clinicId: string
  metadata: Json | null | undefined
  userId: string | null
}): Promise<{ items: ClinicVisitMenu[]; error: string | null; seeded: boolean }> {
  const { supabase } = await import('../../lib/supabase.ts')
  const existing = await supabase
    .from('clinic_visit_menus')
    .select('id', { count: 'exact', head: true })
    .eq('clinic_id', input.clinicId)
  if (existing.error) {
    return { items: [], error: existing.error.message, seeded: false }
  }

  let seeded = false
  if (shouldSeedClinicVisitMenus(existing.count ?? 0)) {
    const { error: insertError } = await supabase
      .from('clinic_visit_menus')
      .insert(
        buildClinicVisitMenuSeedInserts({
          clinicId: input.clinicId,
          metadata: input.metadata,
          userId: input.userId,
        }),
      )
    if (insertError && insertError.code !== '23505') {
      const loaded = await selectActiveMenus(input.clinicId)
      if (loaded.items.length > 0) {
        return { items: loaded.items, error: null, seeded: false }
      }
      return {
        items: fallbackClinicVisitMenus(input.metadata),
        error: null,
        seeded: false,
      }
    }
    seeded = !insertError
  }

  const loaded = await selectActiveMenus(input.clinicId)
  if (loaded.error) return { items: [], error: loaded.error, seeded }
  if (loaded.items.length === 0 && (existing.count ?? 0) === 0) {
    return {
      items: fallbackClinicVisitMenus(input.metadata),
      error: null,
      seeded,
    }
  }
  return { items: loaded.items, error: null, seeded }
}
