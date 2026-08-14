/** レセコンCSV種まきの境界（案A）。常時接続・監視SaaSは置かない。 */

export const RECECON_IMPORT_ACTION = 'patient.import_rececon_csv'
export const RECECON_IMPORT_ENTITY = 'patient_import'
export const RECECON_IMPORT_SOURCE = 'rececon_csv' as const

export const RECECON_IMPORT_AUDIT_KEYS = [
  'source',
  'outcome',
  'parsedCount',
  'staffUpserted',
  'patientsInserted',
  'patientsUpdated',
  'conditionsUpserted',
  'errorCount',
  'count',
] as const

const FORBIDDEN_AUDIT_KEYS = [
  'name',
  'nameKanji',
  'nameKana',
  'chartNumber',
  'fileName',
  'file',
  'errors',
  'message',
  'address',
  'phone',
  '患者',
  'カルテ',
] as const

export type RececonImportAuditOutcome = 'success' | 'partial' | 'failed'

export type RececonImportAuditCounts = {
  parsedCount: number
  staffUpserted: number
  patientsInserted: number
  patientsUpdated: number
  conditionsUpserted: number
  errorCount: number
}

export type RececonImportAuditPayload = RececonImportAuditCounts & {
  source: typeof RECECON_IMPORT_SOURCE
  outcome: RececonImportAuditOutcome
  count: number
}

export function buildRececonImportAuditPayload(
  input: RececonImportAuditCounts & { outcome: RececonImportAuditOutcome },
): RececonImportAuditPayload {
  return {
    source: RECECON_IMPORT_SOURCE,
    outcome: input.outcome,
    parsedCount: input.parsedCount,
    staffUpserted: input.staffUpserted,
    patientsInserted: input.patientsInserted,
    patientsUpdated: input.patientsUpdated,
    conditionsUpserted: input.conditionsUpserted,
    errorCount: input.errorCount,
    count: input.patientsInserted + input.patientsUpdated,
  }
}

export function isRececonImportAuditPayload(
  payload: Record<string, unknown>,
): payload is RececonImportAuditPayload {
  const allowed = new Set<string>(RECECON_IMPORT_AUDIT_KEYS)
  if (Object.keys(payload).some((key) => !allowed.has(key))) return false
  if (payload.source !== RECECON_IMPORT_SOURCE) return false
  if (!['success', 'partial', 'failed'].includes(String(payload.outcome))) return false
  for (const key of [
    'parsedCount',
    'staffUpserted',
    'patientsInserted',
    'patientsUpdated',
    'conditionsUpserted',
    'errorCount',
    'count',
  ] as const) {
    if (typeof payload[key] !== 'number' || !Number.isFinite(payload[key])) return false
  }
  return true
}

export function receconImportAuditHasForbiddenKeys(
  payload: Record<string, unknown>,
): boolean {
  return Object.keys(payload).some((key) =>
    FORBIDDEN_AUDIT_KEYS.some((forbidden) => key === forbidden || key.includes(forbidden)),
  )
}

export function formatRececonImportAllowedColumnsLabel(): string {
  return 'カルテ番号・氏名（漢字/カナ）・主担当医・最終日付'
}

export const RECECON_IMPORT_PAGE_AUDIT_NOTE =
  '取込の記録は操作ログに、実行者・時刻・件数・成否だけ残します。氏名やカルテ番号はログに出しません。'
