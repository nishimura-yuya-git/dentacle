/** 患者アイコン。正は patients.metadata.user_icon（"1"〜"7"）。 */

export const PATIENT_ICON_IDS = ['1', '2', '3', '4', '5', '6', '7'] as const

export type PatientIconId = (typeof PATIENT_ICON_IDS)[number]

type MetadataRecord = Record<string, unknown>

function asRecord(metadata: unknown): MetadataRecord {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {}
  }
  return { ...(metadata as MetadataRecord) }
}

export function isPatientIconId(value: unknown): value is PatientIconId {
  return typeof value === 'string' && (PATIENT_ICON_IDS as readonly string[]).includes(value)
}

export function patientIconSrc(id: PatientIconId): string {
  return `/user_icon/${id}.png`
}

/** 未保存時の安定割り当て。DBは更新しない。 */
export function fallbackPatientIconId(seed: string): PatientIconId {
  const text = seed.trim()
  if (!text) return '1'
  let sum = 0
  for (let index = 0; index < text.length; index += 1) {
    sum += text.charCodeAt(index)
  }
  return PATIENT_ICON_IDS[sum % PATIENT_ICON_IDS.length] ?? '1'
}

export function readPatientIconId(metadata: unknown): PatientIconId | null {
  const raw = asRecord(metadata).user_icon
  return isPatientIconId(raw) ? raw : null
}

export function resolvePatientIconId(metadata: unknown, seed: string): PatientIconId {
  return readPatientIconId(metadata) ?? fallbackPatientIconId(seed)
}

export function withPatientIcon(
  metadata: unknown,
  iconId: PatientIconId,
): MetadataRecord {
  return {
    ...asRecord(metadata),
    user_icon: iconId,
  }
}

/** CSV再取込用。来院回数は更新し、user_icon など他キーは残す。 */
export function withRececonImportMetadata(
  existing: unknown,
  visitCount: number | null,
): MetadataRecord {
  const next: MetadataRecord = {
    ...asRecord(existing),
    seed_source: 'rececon_csv',
  }
  if (visitCount != null) {
    next.visit_count = visitCount
  }
  return next
}
