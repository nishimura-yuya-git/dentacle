/**
 * レセコン連携の身元契約。
 * いまの取込はCSV種まき。将来の医院LAN接続を排除しない。
 * 経路・権限・保持の正は receconIntegration.contract。
 */

export const RECECON_SEED_SOURCES = ['rececon_csv', 'rececon_api'] as const
export type RececonSeedSource = (typeof RECECON_SEED_SOURCES)[number]

export const RECECON_ENTITY_TYPES = ['clinic', 'staff', 'patient'] as const
export type RececonEntityType = (typeof RECECON_ENTITY_TYPES)[number]

/** 患者突合に使ってよいキー。先頭ほど優先。 */
export const RECECON_PATIENT_MATCH_KEYS = ['externalId', 'chartNumber'] as const
export type RececonPatientMatchKey = (typeof RECECON_PATIENT_MATCH_KEYS)[number]

/** 患者マスタの突合に使ってはいけないキー（請求伝票など）。 */
export const RECECON_FORBIDDEN_PATIENT_KEYS = [
  'receiptId',
  'rezeptId',
  'receconReceiptId',
  'レセプト番号',
  'レセプトID',
] as const

export type RececonPatientIdentity = {
  clinicId: string
  chartNumber: string | null
  externalId: string | null
}

export type RececonPatientCandidate = {
  id: string
  chartNumber: string | null
  externalId: string | null
}

export type RececonPatientMatch =
  | { kind: 'external_id'; id: string }
  | { kind: 'chart_number'; id: string }
  | { kind: 'none' }
  | { kind: 'invalid' }
  | {
      kind: 'conflict'
      reason: 'external_id_and_chart_number_point_to_different_patients'
    }

export function normalizeRececonIdentityValue(
  value: string | null | undefined,
): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

export function hasRececonPatientIdentity(identity: RececonPatientIdentity): boolean {
  return Boolean(identity.externalId || identity.chartNumber)
}

/**
 * 外部入力から患者身元だけを拾う。
 * レセプト伝票IDや氏名は無視する。
 */
export function pickRececonPatientIdentity(raw: {
  clinicId: string
  chartNumber?: string | null
  externalId?: string | null
  receiptId?: unknown
  rezeptId?: unknown
  nameKanji?: unknown
}): RececonPatientIdentity {
  return {
    clinicId: raw.clinicId,
    chartNumber: normalizeRececonIdentityValue(raw.chartNumber),
    externalId: normalizeRececonIdentityValue(raw.externalId),
  }
}

export function matchRececonPatient(
  incoming: RececonPatientIdentity,
  existing: RececonPatientCandidate[],
): RececonPatientMatch {
  if (!hasRececonPatientIdentity(incoming)) return { kind: 'invalid' }

  const byExternalId = incoming.externalId
    ? existing.find((row) => row.externalId === incoming.externalId)
    : undefined
  const byChartNumber = incoming.chartNumber
    ? existing.find((row) => row.chartNumber === incoming.chartNumber)
    : undefined

  if (byExternalId && byChartNumber && byExternalId.id !== byChartNumber.id) {
    return {
      kind: 'conflict',
      reason: 'external_id_and_chart_number_point_to_different_patients',
    }
  }
  if (byExternalId) return { kind: 'external_id', id: byExternalId.id }
  if (byChartNumber) return { kind: 'chart_number', id: byChartNumber.id }
  return { kind: 'none' }
}
