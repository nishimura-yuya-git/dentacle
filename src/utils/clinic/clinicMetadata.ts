import {
  RECECON_ASSUMED_VENDOR_ID,
  isRececonVendorId,
  type RececonVendorId,
} from '../../contracts/receconVendor.contract.ts'
import type { Json } from '../../types/database.types.ts'
import {
  DEFAULT_INTRODUCTION_LANE,
  isIntroductionLane,
  type IntroductionLane,
} from '../schedule/proposalLanePresets.ts'

type MetadataRecord = Record<string, unknown>

function asRecord(metadata: Json | null | undefined): MetadataRecord {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {}
  }
  return metadata as MetadataRecord
}

/** clinics.metadata から導入レーンを読む（無ければ立ち上げ） */
export function readIntroductionLane(metadata: Json | null | undefined): IntroductionLane {
  const lane = asRecord(metadata).introduction_lane
  return isIntroductionLane(lane) ? lane : DEFAULT_INTRODUCTION_LANE
}

/** introduction_lane だけをマージした metadata を返す */
export function withIntroductionLane(
  metadata: Json | null | undefined,
  lane: IntroductionLane
): MetadataRecord {
  return {
    ...asRecord(metadata),
    introduction_lane: lane,
  }
}

/** 無いキーは ON。false だけ OFF として残す */
export function readVisitMenuEnabled(
  metadata: Json | null | undefined,
): Record<string, boolean> {
  const raw = asRecord(metadata).visit_menu_enabled
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const enabled: Record<string, boolean> = {}
  for (const [code, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'boolean') enabled[code] = value
  }
  return enabled
}

/** visit_menu_enabled だけをマージする。ON はキーを消す */
export function withVisitMenuEnabled(
  metadata: Json | null | undefined,
  enabled: Record<string, boolean>,
): MetadataRecord {
  const stored: Record<string, boolean> = {}
  for (const [code, value] of Object.entries(enabled)) {
    if (value === false) stored[code] = false
  }
  return {
    ...asRecord(metadata),
    visit_menu_enabled: stored,
  }
}

/** 未設定は想定ベンダー（ノーザ）。院向け画面には出さない */
export function readRececonVendorId(
  metadata: Json | null | undefined,
): RececonVendorId {
  const raw = asRecord(metadata).rececon_vendor
  return isRececonVendorId(raw) ? raw : RECECON_ASSUMED_VENDOR_ID
}

/** rececon_vendor だけをマージする。他の metadata は消さない */
export function withRececonVendorId(
  metadata: Json | null | undefined,
  vendorId: RececonVendorId,
): MetadataRecord {
  return {
    ...asRecord(metadata),
    rececon_vendor: vendorId,
  }
}
