/** プライベート／非公開IPは GeoIP しない */
export function isLookupablePublicIp(ip: string | null | undefined): boolean {
  const value = ip?.trim() ?? ''
  if (!value) return false
  if (value === '::1' || value === '127.0.0.1') return false
  if (value.startsWith('10.')) return false
  if (value.startsWith('192.168.')) return false
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(value)) return false
  if (value.startsWith('fc') || value.startsWith('fd') || value.startsWith('fe80')) return false
  return true
}

type IpWhoResponse = {
  success?: boolean
  country?: string
  region?: string
  city?: string
  message?: string
}

export type IpGeoInfo = {
  label: string
  country: string | null
  region: string | null
  city: string | null
}

/** 国・都道府県・都市を「推定」ラベルにする（緯度経度は保存しない） */
export function formatIpRegionLabel(input: {
  country?: string | null
  region?: string | null
  city?: string | null
}): string {
  const country = input.country?.trim() || ''
  const region = input.region?.trim() || ''
  const city = input.city?.trim() || ''

  const parts: string[] = []
  if (country) parts.push(country)
  if (region && region !== country) parts.push(region)
  // 日本は都道府県までで足りることが多い。都市は都道府県と違うときだけ
  if (city && city !== region && country !== '日本' && country !== 'Japan') {
    parts.push(city)
  } else if (city && country === '日本' && city !== region && !region) {
    parts.push(city)
  }

  if (parts.length === 0) return '—'
  return `${parts.join('・')}（推定）`
}

const EMPTY_GEO: IpGeoInfo = {
  label: '—',
  country: null,
  region: null,
  city: null,
}

const memoryCache = new Map<string, IpGeoInfo>()

async function lookupOne(ip: string): Promise<IpGeoInfo> {
  const cached = memoryCache.get(ip)
  if (cached) return cached

  try {
    const response = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?lang=ja`, {
      method: 'GET',
    })
    if (!response.ok) {
      memoryCache.set(ip, EMPTY_GEO)
      return EMPTY_GEO
    }
    const data = (await response.json()) as IpWhoResponse
    if (!data.success) {
      memoryCache.set(ip, EMPTY_GEO)
      return EMPTY_GEO
    }
    const country = data.country?.trim() || null
    const region = data.region?.trim() || null
    const city = data.city?.trim() || null
    const info: IpGeoInfo = {
      label: formatIpRegionLabel({ country, region, city }),
      country,
      region,
      city,
    }
    memoryCache.set(ip, info)
    return info
  } catch {
    memoryCache.set(ip, EMPTY_GEO)
    return EMPTY_GEO
  }
}

/** ユニークIPをまとめて引き、IP→構造化 Geo を返す */
export async function lookupIpGeoMap(
  ips: Array<string | null | undefined>,
): Promise<Map<string, IpGeoInfo>> {
  const unique = [...new Set(ips.map((ip) => ip?.trim()).filter(Boolean))] as string[]
  const map = new Map<string, IpGeoInfo>()
  const targets = unique.filter((ip) => isLookupablePublicIp(ip))

  for (const ip of targets) {
    map.set(ip, await lookupOne(ip))
  }
  for (const ip of unique) {
    if (!map.has(ip)) map.set(ip, EMPTY_GEO)
  }
  return map
}

/** ラベルだけ欲しい場合の互換ラッパ */
export async function lookupIpRegionMap(
  ips: Array<string | null | undefined>,
): Promise<Map<string, string>> {
  const geo = await lookupIpGeoMap(ips)
  const map = new Map<string, string>()
  for (const [ip, info] of geo) {
    map.set(ip, info.label)
  }
  return map
}
