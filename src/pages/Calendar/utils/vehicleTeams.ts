/** 訪問号車列（Apotoolのユニット列に相当）。最大7、初期表示は4。 */
export const MAX_VEHICLE_COLUMNS = 7
export const INITIAL_VISIBLE_VEHICLE_COLUMNS = 4

export const VEHICLE_COLORS = [
  '#008C01',
  '#0F766E',
  '#2563EB',
  '#7C3AED',
  '#CA8A04',
  '#EA580C',
  '#BE123C',
] as const

export function vehicleTeamName(index: number): string {
  return `訪問${index}号車`
}

/** チーム取得前の表ベース用プレースホルダ（スケルトン表示） */
export function placeholderVehicleTeams(count: number): Array<{
  id: string
  name: string
  color: string
  sort_order: number
}> {
  const n = Math.min(MAX_VEHICLE_COLUMNS, Math.max(1, count))
  return Array.from({ length: n }, (_, index) => {
    const order = index + 1
    return {
      id: `placeholder-vehicle-${order}`,
      name: vehicleTeamName(order),
      color: VEHICLE_COLORS[index] ?? '#008C01',
      sort_order: order,
    }
  })
}

export function isVehicleTeamName(name: string): boolean {
  return /^訪問[1-7]号車$/.test(name)
}

export function vehicleIndexFromName(name: string): number | null {
  const matched = name.match(/^訪問([1-7])号車$/)
  if (!matched) return null
  return Number(matched[1])
}
