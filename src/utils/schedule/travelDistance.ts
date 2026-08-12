/**
 * 住所→移動根拠の距離 SSoT（§6.16）。
 * エージェントには生住所を渡さず、ここから作った距離行列（分）を渡す。
 *
 * 座標がある場合はハバースイン→分換算。
 * 無い場合は同一施設 / 同一エリアのヒューリスティック（地図API未接続時の暫定）。
 */

export type TravelLocation = {
  patientId: string
  facilityId: string | null
  areaLabel: string | null
  latitude: number | null
  longitude: number | null
}

/** 都市部の平均移動速度（km/h）。距離→分の換算に使う */
export const ASSUMED_TRAVEL_KMH = 20

/** 同一施設内の最低移動分 */
export const SAME_FACILITY_MINUTES = 2

/** 同一エリア（座標なし）の目安移動分 */
export const SAME_AREA_MINUTES = 10

/** エリア違い・座標なしの既定移動分 */
export const DEFAULT_CROSS_AREA_MINUTES = 35

const EARTH_KM = 6371

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/** 2点間の大円距離（km） */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(a)))
}

export function kmToTravelMinutes(km: number): number {
  if (km <= 0) return SAME_FACILITY_MINUTES
  return Math.max(5, Math.round((km / ASSUMED_TRAVEL_KMH) * 60))
}

export function travelMinutesBetween(
  a: TravelLocation,
  b: TravelLocation,
): number {
  if (a.patientId === b.patientId) return 0
  if (a.facilityId && b.facilityId && a.facilityId === b.facilityId) {
    return SAME_FACILITY_MINUTES
  }
  if (
    a.latitude !== null &&
    a.longitude !== null &&
    b.latitude !== null &&
    b.longitude !== null
  ) {
    return kmToTravelMinutes(
      haversineKm(a.latitude, a.longitude, b.latitude, b.longitude),
    )
  }
  const areaA = a.areaLabel?.trim() || ''
  const areaB = b.areaLabel?.trim() || ''
  if (areaA && areaB && areaA === areaB) return SAME_AREA_MINUTES
  return DEFAULT_CROSS_AREA_MINUTES
}

/** patientId → patientId → 移動分（対称） */
export function buildTravelMinutesMatrix(
  locations: TravelLocation[],
): Record<string, Record<string, number>> {
  const matrix: Record<string, Record<string, number>> = {}
  for (const from of locations) {
    matrix[from.patientId] = {}
    for (const to of locations) {
      matrix[from.patientId][to.patientId] = travelMinutesBetween(from, to)
    }
  }
  return matrix
}

/**
 * エージェント送信用の疎行列。各患者について近い順 topK のみ残す（プロンプト肥大化防止）。
 * フル行列はアプリ側 validate / pack で使う。
 */
export function buildSparseTravelMinutesMatrix(
  locations: TravelLocation[],
  topK = 8,
): Record<string, Record<string, number>> {
  const full = buildTravelMinutesMatrix(locations)
  const sparse: Record<string, Record<string, number>> = {}
  const k = Math.max(1, Math.floor(topK))

  for (const from of locations) {
    const row = full[from.patientId] ?? {}
    const neighbors = Object.entries(row)
      .filter(([toId]) => toId !== from.patientId)
      .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
      .slice(0, k)
    sparse[from.patientId] = Object.fromEntries(neighbors)
  }
  return sparse
}

export function hasUsableAddress(address: string | null | undefined): boolean {
  return Boolean(address && address.trim().length > 0)
}
