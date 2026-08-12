import {
  getJapanPrefecturePin,
  isJapanCountryName,
  resolveJapanPrefectureKey,
} from './japanPrefecturePins.ts'
import type { IpGeoInfo } from './lookupIpRegion.ts'

export const AUTH_AUDIT_PIN_OVERSEAS = 'overseas'
export const AUTH_AUDIT_PIN_UNKNOWN = 'unknown'

export type AuthAuditMapPinKind = 'prefecture' | 'overseas' | 'unknown'

export type AuthAuditMapPinRef = {
  key: string
  kind: AuthAuditMapPinKind
  label: string
  /** 当面の異常: 海外推定 */
  isAnomaly: boolean
}

/** GeoIP結果から地図ピン参照を決める（都道府県塗り分け用。DB非保存） */
export function resolveAuthAuditMapPin(geo: IpGeoInfo | null | undefined): AuthAuditMapPinRef {
  if (!geo || geo.label === '—' || (!geo.country && !geo.region)) {
    return {
      key: AUTH_AUDIT_PIN_UNKNOWN,
      kind: 'unknown',
      label: '推定不可',
      isAnomaly: false,
    }
  }

  if (!isJapanCountryName(geo.country)) {
    return {
      key: AUTH_AUDIT_PIN_OVERSEAS,
      kind: 'overseas',
      label: geo.label || '海外（推定）',
      isAnomaly: true,
    }
  }

  const prefKey = resolveJapanPrefectureKey(geo.region)
  const pin = prefKey ? getJapanPrefecturePin(prefKey) : undefined
  if (!pin) {
    return {
      key: AUTH_AUDIT_PIN_UNKNOWN,
      kind: 'unknown',
      label: geo.label || '日本・地域不明（推定）',
      isAnomaly: false,
    }
  }

  return {
    key: pin.key,
    kind: 'prefecture',
    label: pin.name,
    isAnomaly: false,
  }
}

export type AuthAuditMapCluster = AuthAuditMapPinRef & {
  count: number
}

/** 行の pin_key を集約して地図用クラスタにする */
export function clusterAuthAuditMapPins(
  rows: Array<{ pin_key: string; region_label: string; is_anomaly: boolean }>,
): AuthAuditMapCluster[] {
  const counts = new Map<string, AuthAuditMapCluster>()

  for (const row of rows) {
    const key = row.pin_key || AUTH_AUDIT_PIN_UNKNOWN
    const existing = counts.get(key)
    if (existing) {
      existing.count += 1
      continue
    }

    if (key === AUTH_AUDIT_PIN_OVERSEAS) {
      counts.set(key, {
        key,
        kind: 'overseas',
        label: '海外（推定）',
        isAnomaly: true,
        count: 1,
      })
      continue
    }

    if (key === AUTH_AUDIT_PIN_UNKNOWN) {
      counts.set(key, {
        key,
        kind: 'unknown',
        label: '推定不可',
        isAnomaly: false,
        count: 1,
      })
      continue
    }

    const pin = getJapanPrefecturePin(key)
    counts.set(key, {
      key,
      kind: 'prefecture',
      label: pin?.name ?? key,
      isAnomaly: false,
      count: 1,
    })
  }

  return [...counts.values()].sort((a, b) => b.count - a.count)
}
