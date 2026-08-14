export type VisitMenuSlot = '1' | '2' | '3' | 'sub'

export type VisitMenuItem = {
  code: string
  name: string
  durationMinutes: number
}

/**
 * 診療メニュー表の正（Apotool添付の処置名＋所要時間）。
 * 表示は `名称 (N分)`。院ごとの ON/OFF は clinics.metadata。
 */
export const VISIT_MENU_CATALOG: readonly VisitMenuItem[] = [
  { code: 'extraction', name: '抜歯', durationMinutes: 25 },
  { code: 'ext-after-sp', name: 'EXT後SP', durationMinutes: 15 },
  { code: 'suture-removal', name: '抜糸', durationMinutes: 15 },
  { code: 'electrosurgery-gp', name: '電メス (GP)', durationMinutes: 25 },
  { code: 'curettage', name: '掻爬 (ソウハ)', durationMinutes: 25 },
  { code: 'set-after-adj', name: 'set後adj', durationMinutes: 15 },
  { code: 'follow-up', name: '経過', durationMinutes: 15 },
  { code: 'emergency', name: '急患', durationMinutes: 25 },
  { code: 'oral-care', name: '口腔ケア', durationMinutes: 15 },
  { code: 'fluoride', name: 'フッ素塗布', durationMinutes: 20 },
  { code: 'perio', name: '歯周病治療', durationMinutes: 25 },
  { code: 'intraoral-photo', name: '口腔内写真', durationMinutes: 25 },
  { code: 'maintenance', name: 'メンテナンス', durationMinutes: 15 },
  { code: 'free-checkup', name: '無料検診希望', durationMinutes: 20 },
  { code: 'first-visit', name: '初診', durationMinutes: 40 },
  { code: 're-first-visit', name: '再初診', durationMinutes: 40 },
  { code: 'estimate', name: '見積もり', durationMinutes: 25 },
  { code: 'referral-letter', name: '紹介状渡す', durationMinutes: 25 },
  { code: 'xray', name: 'X-ray', durationMinutes: 15 },
  { code: 'xray-diagnosis', name: 'X-ray診断', durationMinutes: 15 },
  { code: 'swallow-first-visit', name: '嚥下初診', durationMinutes: 60 },
  { code: 'swallow-rehab', name: '摂食嚥下リハビリ', durationMinutes: 40 },
  { code: 'swallow-endoscopy', name: '摂食嚥下内視鏡', durationMinutes: 40 },
  { code: 'examination', name: '診査', durationMinutes: 15 },
  { code: 'candida-test', name: 'カンジダ検査', durationMinutes: 25 },
  { code: 'study-model', name: 'マルモ 【O模】', durationMinutes: 25 },
  { code: 'oral-bacteria', name: '口腔細菌定量検査', durationMinutes: 20 },
  { code: 'time-change', name: '時間変更有り', durationMinutes: 15 },
  { code: 'handover', name: '引継ぎ有り', durationMinutes: 15 },
]

export function formatVisitMenuLabel(item: VisitMenuItem): string {
  return `${item.name} (${item.durationMinutes}分)`
}

export function findVisitMenu(code: string): VisitMenuItem | undefined {
  return VISIT_MENU_CATALOG.find((item) => item.code === code)
}
