import {
  INITIAL_VISIBLE_VEHICLE_COLUMNS,
  MAX_VEHICLE_COLUMNS,
  vehicleIndexFromName,
} from '@/pages/Calendar/utils/vehicleTeams'
import type { VehicleTeam } from '@/pages/Calendar/utils/ensureVehicleTeams'

function storageKey(clinicId: string): string {
  return `dentacle.calendar.visibleVehicleColumns.${clinicId}`
}

export function clampVisibleColumns(value: number): number {
  return Math.min(
    MAX_VEHICLE_COLUMNS,
    Math.max(INITIAL_VISIBLE_VEHICLE_COLUMNS, Math.floor(value))
  )
}

/** ユーザーが「列を追加」した表示列数（クリニック単位） */
export function readStoredVisibleColumns(clinicId: string): number | null {
  try {
    const raw = localStorage.getItem(storageKey(clinicId))
    if (!raw) return null
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) return null
    return clampVisibleColumns(parsed)
  } catch {
    return null
  }
}

export function writeStoredVisibleColumns(clinicId: string, columns: number): void {
  try {
    localStorage.setItem(storageKey(clinicId), String(clampVisibleColumns(columns)))
  } catch {
    // private mode 等では無視
  }
}

/**
 * 表示列数 = max(初期4, 保存値, 予定が付いている最大号車)。
 * 号車に予定を登録したら、リロード後もその列まで残す。
 */
export function resolveVisibleColumns(input: {
  stored: number | null
  teams: VehicleTeam[]
  usedTeamIds: Array<string | null | undefined>
}): number {
  const idToIndex = new Map(
    input.teams
      .map((team) => {
        const index = vehicleIndexFromName(team.name)
        return index == null ? null : ([team.id, index] as const)
      })
      .filter((row): row is readonly [string, number] => row != null)
  )

  let maxUsed = 0
  for (const teamId of input.usedTeamIds) {
    if (!teamId) continue
    const index = idToIndex.get(teamId)
    if (index != null && index > maxUsed) maxUsed = index
  }

  return clampVisibleColumns(
    Math.max(INITIAL_VISIBLE_VEHICLE_COLUMNS, input.stored ?? 0, maxUsed)
  )
}
