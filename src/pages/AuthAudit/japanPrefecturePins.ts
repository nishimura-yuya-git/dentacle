/**
 * 都道府県キーと Geolonia map-full.svg の data-code 対応。
 * GeoIPの都道府県名をキーに正規化する。証拠位置ではない。
 * 地図: https://geolonia.github.io/japanese-prefectures/ （GFDL）
 */

export type JapanPrefecturePin = {
  key: string
  name: string
  /** JIS X 0401 / Geolonia data-code（"01"〜"47"） */
  code: string
}

/** 主要47都道府県（Geolonia SVG の class / data-code と対応） */
export const JAPAN_PREFECTURE_PINS: JapanPrefecturePin[] = [
  { key: 'hokkaido', name: '北海道', code: '01' },
  { key: 'aomori', name: '青森県', code: '02' },
  { key: 'iwate', name: '岩手県', code: '03' },
  { key: 'miyagi', name: '宮城県', code: '04' },
  { key: 'akita', name: '秋田県', code: '05' },
  { key: 'yamagata', name: '山形県', code: '06' },
  { key: 'fukushima', name: '福島県', code: '07' },
  { key: 'ibaraki', name: '茨城県', code: '08' },
  { key: 'tochigi', name: '栃木県', code: '09' },
  { key: 'gunma', name: '群馬県', code: '10' },
  { key: 'saitama', name: '埼玉県', code: '11' },
  { key: 'chiba', name: '千葉県', code: '12' },
  { key: 'tokyo', name: '東京都', code: '13' },
  { key: 'kanagawa', name: '神奈川県', code: '14' },
  { key: 'niigata', name: '新潟県', code: '15' },
  { key: 'toyama', name: '富山県', code: '16' },
  { key: 'ishikawa', name: '石川県', code: '17' },
  { key: 'fukui', name: '福井県', code: '18' },
  { key: 'yamanashi', name: '山梨県', code: '19' },
  { key: 'nagano', name: '長野県', code: '20' },
  { key: 'gifu', name: '岐阜県', code: '21' },
  { key: 'shizuoka', name: '静岡県', code: '22' },
  { key: 'aichi', name: '愛知県', code: '23' },
  { key: 'mie', name: '三重県', code: '24' },
  { key: 'shiga', name: '滋賀県', code: '25' },
  { key: 'kyoto', name: '京都府', code: '26' },
  { key: 'osaka', name: '大阪府', code: '27' },
  { key: 'hyogo', name: '兵庫県', code: '28' },
  { key: 'nara', name: '奈良県', code: '29' },
  { key: 'wakayama', name: '和歌山県', code: '30' },
  { key: 'tottori', name: '鳥取県', code: '31' },
  { key: 'shimane', name: '島根県', code: '32' },
  { key: 'okayama', name: '岡山県', code: '33' },
  { key: 'hiroshima', name: '広島県', code: '34' },
  { key: 'yamaguchi', name: '山口県', code: '35' },
  { key: 'tokushima', name: '徳島県', code: '36' },
  { key: 'kagawa', name: '香川県', code: '37' },
  { key: 'ehime', name: '愛媛県', code: '38' },
  { key: 'kochi', name: '高知県', code: '39' },
  { key: 'fukuoka', name: '福岡県', code: '40' },
  { key: 'saga', name: '佐賀県', code: '41' },
  { key: 'nagasaki', name: '長崎県', code: '42' },
  { key: 'kumamoto', name: '熊本県', code: '43' },
  { key: 'oita', name: '大分県', code: '44' },
  { key: 'miyazaki', name: '宮崎県', code: '45' },
  { key: 'kagoshima', name: '鹿児島県', code: '46' },
  { key: 'okinawa', name: '沖縄県', code: '47' },
]

const PIN_BY_KEY = new Map(JAPAN_PREFECTURE_PINS.map((pin) => [pin.key, pin]))
const KEY_BY_CODE = new Map(JAPAN_PREFECTURE_PINS.map((pin) => [pin.code, pin.key]))

/** 英語・略称など → 都道府県 key */
const ALIAS_TO_KEY: Record<string, string> = {
  hokkaido: 'hokkaido',
  北海道: 'hokkaido',
  aomori: 'aomori',
  青森: 'aomori',
  青森県: 'aomori',
  iwate: 'iwate',
  岩手: 'iwate',
  岩手県: 'iwate',
  miyagi: 'miyagi',
  宮城: 'miyagi',
  宮城県: 'miyagi',
  akita: 'akita',
  秋田: 'akita',
  秋田県: 'akita',
  yamagata: 'yamagata',
  山形: 'yamagata',
  山形県: 'yamagata',
  fukushima: 'fukushima',
  福島: 'fukushima',
  福島県: 'fukushima',
  ibaraki: 'ibaraki',
  茨城: 'ibaraki',
  茨城県: 'ibaraki',
  tochigi: 'tochigi',
  栃木: 'tochigi',
  栃木県: 'tochigi',
  gunma: 'gunma',
  群馬: 'gunma',
  群馬県: 'gunma',
  saitama: 'saitama',
  埼玉: 'saitama',
  埼玉県: 'saitama',
  chiba: 'chiba',
  千葉: 'chiba',
  千葉県: 'chiba',
  tokyo: 'tokyo',
  'tokyo-to': 'tokyo',
  東京: 'tokyo',
  東京都: 'tokyo',
  kanagawa: 'kanagawa',
  神奈川: 'kanagawa',
  神奈川県: 'kanagawa',
  niigata: 'niigata',
  新潟: 'niigata',
  新潟県: 'niigata',
  toyama: 'toyama',
  富山: 'toyama',
  富山県: 'toyama',
  ishikawa: 'ishikawa',
  石川: 'ishikawa',
  石川県: 'ishikawa',
  fukui: 'fukui',
  福井: 'fukui',
  福井県: 'fukui',
  yamanashi: 'yamanashi',
  山梨: 'yamanashi',
  山梨県: 'yamanashi',
  nagano: 'nagano',
  長野: 'nagano',
  長野県: 'nagano',
  gifu: 'gifu',
  岐阜: 'gifu',
  岐阜県: 'gifu',
  shizuoka: 'shizuoka',
  静岡: 'shizuoka',
  静岡県: 'shizuoka',
  aichi: 'aichi',
  愛知: 'aichi',
  愛知県: 'aichi',
  mie: 'mie',
  三重: 'mie',
  三重県: 'mie',
  shiga: 'shiga',
  滋賀: 'shiga',
  滋賀県: 'shiga',
  kyoto: 'kyoto',
  京都: 'kyoto',
  京都府: 'kyoto',
  osaka: 'osaka',
  大阪: 'osaka',
  大阪府: 'osaka',
  hyogo: 'hyogo',
  兵庫: 'hyogo',
  兵庫県: 'hyogo',
  nara: 'nara',
  奈良: 'nara',
  奈良県: 'nara',
  wakayama: 'wakayama',
  和歌山: 'wakayama',
  和歌山県: 'wakayama',
  tottori: 'tottori',
  鳥取: 'tottori',
  鳥取県: 'tottori',
  shimane: 'shimane',
  島根: 'shimane',
  島根県: 'shimane',
  okayama: 'okayama',
  岡山: 'okayama',
  岡山県: 'okayama',
  hiroshima: 'hiroshima',
  広島: 'hiroshima',
  広島県: 'hiroshima',
  yamaguchi: 'yamaguchi',
  山口: 'yamaguchi',
  山口県: 'yamaguchi',
  tokushima: 'tokushima',
  徳島: 'tokushima',
  徳島県: 'tokushima',
  kagawa: 'kagawa',
  香川: 'kagawa',
  香川県: 'kagawa',
  ehime: 'ehime',
  愛媛: 'ehime',
  愛媛県: 'ehime',
  kochi: 'kochi',
  高知: 'kochi',
  高知県: 'kochi',
  fukuoka: 'fukuoka',
  福岡: 'fukuoka',
  福岡県: 'fukuoka',
  saga: 'saga',
  佐賀: 'saga',
  佐賀県: 'saga',
  nagasaki: 'nagasaki',
  長崎: 'nagasaki',
  長崎県: 'nagasaki',
  kumamoto: 'kumamoto',
  熊本: 'kumamoto',
  熊本県: 'kumamoto',
  oita: 'oita',
  大分: 'oita',
  大分県: 'oita',
  miyazaki: 'miyazaki',
  宮崎: 'miyazaki',
  宮崎県: 'miyazaki',
  kagoshima: 'kagoshima',
  鹿児島: 'kagoshima',
  鹿児島県: 'kagoshima',
  okinawa: 'okinawa',
  沖縄: 'okinawa',
  沖縄県: 'okinawa',
}

export function isJapanCountryName(country: string | null | undefined): boolean {
  const value = country?.trim().toLowerCase() ?? ''
  if (!value) return false
  return value === '日本' || value === 'japan' || value === 'jp' || value === 'jpn'
}

/** GeoIPの region 文字列を都道府県 key に正規化。不明なら null */
export function resolveJapanPrefectureKey(region: string | null | undefined): string | null {
  const raw = region?.trim() ?? ''
  if (!raw) return null

  const direct = ALIAS_TO_KEY[raw] ?? ALIAS_TO_KEY[raw.toLowerCase()]
  if (direct) return direct

  // 「大阪府」→「大阪」なども試す
  const stripped = raw.replace(/(都|道|府|県)$/u, '')
  return ALIAS_TO_KEY[stripped] ?? ALIAS_TO_KEY[stripped.toLowerCase()] ?? null
}

export function getJapanPrefecturePin(key: string): JapanPrefecturePin | undefined {
  return PIN_BY_KEY.get(key)
}

/** Geolonia SVG の data-code → 都道府県 key */
export function getJapanPrefectureKeyByCode(code: string | null | undefined): string | null {
  const normalized = code?.trim().padStart(2, '0') ?? ''
  if (!normalized) return null
  return KEY_BY_CODE.get(normalized) ?? null
}

/** 都道府県 key → Geolonia data-code */
export function getJapanPrefectureCode(key: string): string | null {
  return PIN_BY_KEY.get(key)?.code ?? null
}
