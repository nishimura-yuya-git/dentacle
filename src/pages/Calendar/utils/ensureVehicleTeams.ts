import { supabase } from '@/lib/supabase'
import {
  MAX_VEHICLE_COLUMNS,
  VEHICLE_COLORS,
  vehicleTeamName,
} from '@/pages/Calendar/utils/vehicleTeams'

export type VehicleTeam = {
  id: string
  name: string
  color: string | null
  sort_order: number
}

/**
 * クリニックに訪問1〜7号車チームが無ければ作成し、号車順で返す。
 */
export async function ensureVehicleTeams(clinicId: string): Promise<{
  teams: VehicleTeam[]
  error: string | null
}> {
  const { data: existing, error: readError } = await supabase
    .from('teams')
    .select('id, name, color, sort_order')
    .eq('clinic_id', clinicId)
    .is('deleted_at', null)
    .eq('is_active', true)
    .order('sort_order')

  if (readError) {
    return { teams: [], error: readError.message }
  }

  const byName = new Map((existing ?? []).map((team) => [team.name, team]))
  const missing = []

  for (let i = 1; i <= MAX_VEHICLE_COLUMNS; i += 1) {
    const name = vehicleTeamName(i)
    if (!byName.has(name)) {
      missing.push({
        clinic_id: clinicId,
        name,
        sort_order: i,
        color: VEHICLE_COLORS[i - 1] ?? '#008C01',
        is_active: true,
      })
    }
  }

  if (missing.length > 0) {
    const { error: insertError } = await supabase.from('teams').insert(missing)
    if (insertError) {
      return { teams: [], error: insertError.message }
    }
  }

  const { data: refreshed, error: refreshError } = await supabase
    .from('teams')
    .select('id, name, color, sort_order')
    .eq('clinic_id', clinicId)
    .is('deleted_at', null)
    .eq('is_active', true)
    .order('sort_order')

  if (refreshError) {
    return { teams: [], error: refreshError.message }
  }

  const vehicles = (refreshed ?? [])
    .filter((team) => /^訪問[1-7]号車$/.test(team.name))
    .sort((a, b) => a.sort_order - b.sort_order)

  return { teams: vehicles, error: null }
}
