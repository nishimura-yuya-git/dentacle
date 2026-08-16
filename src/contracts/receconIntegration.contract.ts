/**
 * レセコン連携の安全契約。
 * いまの取込は院内CSV。将来の医院LAN接続（VPN・閉域・TLS API・院内中継）も同じ最小限に従う。
 * 「医院LANに入らない」は当面の手段であり、永久禁止ではない。
 */

export const RECECON_CONNECTION_MODES = [
  'clinic_csv_export',
  'tls_https_api',
  'vpn_or_closed_network',
  'clinic_side_connector',
] as const
export type RececonConnectionMode = (typeof RECECON_CONNECTION_MODES)[number]

/** いま開いている経路。将来の接続モードを排除しない。 */
export const RECECON_CURRENT_CONNECTION_MODE: RececonConnectionMode = 'clinic_csv_export'

export const RECECON_SECURED_LINK_MODES = [
  'tls_https_api',
  'vpn_or_closed_network',
  'clinic_side_connector',
] as const
export type RececonSecuredLinkMode = (typeof RECECON_SECURED_LINK_MODES)[number]

export const RECECON_MIN_TLS_VERSION = '1.3' as const
export const RECECON_ALLOWED_APP_PORTS = [443] as const
export const RECECON_FORBIDDEN_PORTS = [5432, 5433, 3306, 1433, 1521, 27017] as const

export const RECECON_ALLOWLIST_KINDS = ['ip', 'domain', 'vpn_closed'] as const
export type RececonAllowlistKind = (typeof RECECON_ALLOWLIST_KINDS)[number]

export const RECECON_DEFAULT_ACCESS = 'read' as const
export const RECECON_WRITE_REQUIRES_SEPARATE_CONTRACT = true

export const RECECON_ALLOWED_PATIENT_FIELDS = [
  'chartNumber',
  'externalId',
  'nameKanji',
  'nameKana',
  'primaryDoctor',
  'lastVisitDate',
  'visitCount',
] as const
export type RececonAllowedPatientField = (typeof RECECON_ALLOWED_PATIENT_FIELDS)[number]

export const RECECON_FORBIDDEN_PATIENT_FIELDS = [
  'birthDate',
  'insuranceNumber',
  'insuranceCard',
  'chartBody',
  'rezeptBody',
  'receiptId',
  'points',
  'billingAmount',
] as const

export const RECECON_ALLOWED_FIELDS_LABEL_JA =
  'カルテ番号・氏名（漢字/カナ）・主担当医・最終日付・診療回数'

export const RECECON_EPHEMERAL_ARTIFACTS = ['uploaded_csv', 'parse_buffer'] as const
export const RECECON_PERSISTENT_ARTIFACTS = ['patient_seed', 'visit_conditions_seed'] as const

export const RECECON_CREDENTIAL_POLICY = {
  storeInBrowser: false,
  giveToAgent: false,
  encryptAtRest: true,
  owners: ['clinic_admin', 'platform_ops'] as const,
} as const

export const RECECON_ACCESS_LOG_POLICY = {
  importPayload: 'counts_and_outcome_only',
  includeChartNumber: false,
  includePatientName: false,
  /** 接続開始前に契約で決める。未決のまま本番接続しない。 */
  retentionYears: null,
} as const

export const RECECON_GUIDELINE_STANCE = 'design_to_comply' as const
export const RECECON_GUIDELINE_REFERENCES = [
  '厚生労働省『医療情報システムの安全管理に関するガイドライン』',
  '経済産業省・総務省『医療情報を取り扱う情報システム・サービスの提供事業者における安全管理ガイドライン』',
] as const

export type RececonNetworkPlan = {
  mode: RececonConnectionMode
  tlsVersion: string | null
  ports: number[]
  allowlist: RececonAllowlistKind | 'none'
  opensDatabasePort: boolean
  agentDirect: boolean
}

export function isClinicLanEntryForeverForbidden(): false {
  return false
}

export function isRececonSecuredLinkMode(mode: RececonConnectionMode): boolean {
  return (RECECON_SECURED_LINK_MODES as readonly string[]).includes(mode)
}

export function isRececonFieldAllowed(field: string): boolean {
  return (RECECON_ALLOWED_PATIENT_FIELDS as readonly string[]).includes(field)
}

export function isRececonFieldForbidden(field: string): boolean {
  return (RECECON_FORBIDDEN_PATIENT_FIELDS as readonly string[]).includes(field)
}

export function isRececonNetworkPlanCompliant(plan: RececonNetworkPlan): {
  ok: boolean
  reasons: string[]
} {
  const reasons: string[] = []
  if (plan.opensDatabasePort) {
    reasons.push('データベース接続ポートは開かない')
  }
  if (plan.agentDirect) {
    reasons.push('エージェントがレセコンへ直接接続してはならない')
  }
  if (plan.ports.some((port) => (RECECON_FORBIDDEN_PORTS as readonly number[]).includes(port))) {
    reasons.push('禁止ポートを含んでいる')
  }

  if (isRececonSecuredLinkMode(plan.mode)) {
    if (plan.tlsVersion !== RECECON_MIN_TLS_VERSION) {
      reasons.push(`TLS ${RECECON_MIN_TLS_VERSION} 以上が必要`)
    }
    if (plan.ports.length === 0 || plan.ports.some((port) => !(RECECON_ALLOWED_APP_PORTS as readonly number[]).includes(port))) {
      reasons.push('開けるポートは連携に必要なもの（HTTPS 443）だけ')
    }
    if (plan.allowlist === 'none') {
      reasons.push('許可した相手以外は遮断する')
    }
  }

  return { ok: reasons.length === 0, reasons }
}

export type RececonResponsibilityParty = 'clinic' | 'rececon_vendor' | 'dentacle' | 'shared'

export const RECECON_RESPONSIBILITY = {
  receconHostAndClinicPc: 'clinic',
  csvExportAndFileChoice: 'clinic',
  receconProductBehavior: 'rececon_vendor',
  afterImportStorageAndUi: 'dentacle',
  scheduleAndRls: 'dentacle',
  clinicLanInterior: 'clinic',
  securedLinkClinicEndpoint: 'clinic',
  securedLinkCloudEndpoint: 'dentacle',
  vpnClosedPath: 'shared',
} as const satisfies Record<string, RececonResponsibilityParty>
