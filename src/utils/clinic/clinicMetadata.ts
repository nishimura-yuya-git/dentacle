import type { Json } from '@/types/database.types'
import {
  DEFAULT_INTRODUCTION_LANE,
  isIntroductionLane,
  type IntroductionLane,
} from '@/utils/schedule/proposalLanePresets'

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
