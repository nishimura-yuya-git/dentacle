/**
 * レセコン想定ベンダー。院向け画面には出さない。
 * ノーザ導入は長期の宿題ではなく、今から受け皿と安全条件を固定する。
 * 接続条件は receconIntegration、身元は receconIdentity。
 */

export const RECECON_VENDOR_IDS = ['nhosa'] as const
export type RececonVendorId = (typeof RECECON_VENDOR_IDS)[number]

export const RECECON_ASSUMED_VENDOR_ID: RececonVendorId = 'nhosa'

export const RECECON_ASSUMED_VENDOR = {
  id: 'nhosa',
  legalNameJa: '株式会社ノーザ',
  colloquialJa: 'ノーズ',
  products: ['WiseStaff', 'clevia'],
  clinicFacingLabel: 'レセコン',
} as const

export const RECECON_CLINIC_FACING_VENDOR_LABEL =
  RECECON_ASSUMED_VENDOR.clinicFacingLabel

/** 院向け画面・ヘルプ・取込説明に出してはいけない内部名 */
export const RECECON_VENDOR_NAMES_FORBIDDEN_ON_CLINIC_UI = [
  'ノーザ',
  'ノーズ',
  'Nhosa',
  'WiseStaff',
  'clevia',
] as const

export function isRececonVendorId(value: unknown): value is RececonVendorId {
  return (
    typeof value === 'string' &&
    (RECECON_VENDOR_IDS as readonly string[]).includes(value)
  )
}

/** 今すでに固定してある導入準備 */
export const RECECON_NHOSA_NOW_READY = {
  identityColumns: true,
  matchContract: true,
  securityContract: true,
  clinicMetadataSlot: true,
  clinicFacingCopy: true,
} as const

/** 接続情報を受け取るまで開かないもの */
export const RECECON_NHOSA_BLOCKED_UNTIL_CREDENTIALS = {
  liveApiClient: true,
  storedVendorCredentials: true,
  writeAccess: true,
} as const

export function clinicFacingRececonLabel(): string {
  return RECECON_CLINIC_FACING_VENDOR_LABEL
}
