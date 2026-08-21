/**
 * Apotool 患者編集ページから住所を取得し CSV に出す（一時利用）。
 * Cookie は Playwright ログイン後に渡す。認証情報はファイルに残さない。
 *
 * 使い方:
 *   APOTOOL_OFFICE_KEY=... APOTOOL_COOKIE='SID=...' node scripts/scrape-apotool-addresses.mjs
 *   APOTOOL_COOKIE='...' APOTOOL_CHARTS='1,2,3' node scripts/scrape-apotool-addresses.mjs
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const BASE = 'https://apo-toolboxes.stransa.co.jp'
const OUT_DIR = join(process.cwd(), 'tmp')
const OFFICE_KEY = process.env.APOTOOL_OFFICE_KEY?.trim() || ''
const COOKIE = process.env.APOTOOL_COOKIE || ''
const CONCURRENCY = Number(process.env.APOTOOL_CONCURRENCY || 6)
const chartsEnv = process.env.APOTOOL_CHARTS || ''
const chartsFile = process.env.APOTOOL_CHARTS_FILE || ''

if (!OFFICE_KEY) {
  console.error('APOTOOL_OFFICE_KEY を環境変数で指定してください（値は Git に書かない）')
  process.exit(1)
}

if (!COOKIE.includes('SID=')) {
  console.error('APOTOOL_COOKIE に SID=... を含めて指定してください')
  process.exit(1)
}

mkdirSync(OUT_DIR, { recursive: true })

function loadTargetCharts() {
  if (chartsFile && existsSync(chartsFile)) {
    const raw = readFileSync(chartsFile, 'utf8').trim()
    if (raw.startsWith('[')) {
      return new Set(JSON.parse(raw).map(String))
    }
    return new Set(
      raw
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean),
    )
  }
  if (chartsEnv) {
    return new Set(
      chartsEnv
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean),
    )
  }
  return null
}

async function apoFetch(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json, text/html, */*',
      'X-Requested-With': 'XMLHttpRequest',
      Cookie: COOKIE,
      ...(init.headers || {}),
    },
  })
  return res
}

async function loadAllPatients() {
  const items = []
  let page = 1
  let total = Infinity
  while (items.length < total && page < 300) {
    const res = await apoFetch('/user/patient/load_patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: OFFICE_KEY,
        type: 'all',
        condition: { is_last: 1, keyword: '', checked_in_at: '' },
        sort: { order_field: 'checked_in_at', order_flag: 'desc' },
        page,
        limit: null,
      }),
    })
    if (!res.ok) {
      throw new Error(`load_patients failed: HTTP ${res.status}`)
    }
    const json = await res.json()
    total = Number(json.total || 0)
    const batch = json.items || []
    if (batch.length === 0) break
    for (const p of batch) {
      items.push({
        id: String(p.patient_id || p.id),
        registration_number: String(p.registration_number ?? '').trim(),
        name: String(p.name || ''),
      })
    }
    console.error(`list page ${page}: ${items.length}/${total}`)
    page += 1
  }
  const byId = new Map()
  for (const it of items) byId.set(it.id, it)
  return [...byId.values()]
}

function extractPatientJson(html) {
  const markers = ['"zip":', '"address":', '"registration_number":']
  let best = null
  for (const marker of markers) {
    let from = 0
    while (from < html.length) {
      const at = html.indexOf(marker, from)
      if (at < 0) break
      let start = at
      while (start > 0 && html[start] !== '{') start -= 1
      let depth = 0
      let end = -1
      for (let i = start; i < Math.min(html.length, start + 80000); i += 1) {
        const ch = html[i]
        if (ch === '{') depth += 1
        else if (ch === '}') {
          depth -= 1
          if (depth === 0) {
            end = i + 1
            break
          }
        }
      }
      if (end > start) {
        const raw = html.slice(start, end)
        try {
          const obj = JSON.parse(raw)
          if (obj && (obj.zip != null || obj.address != null) && obj.registration_number != null) {
            best = obj
            break
          }
        } catch {
          // continue
        }
      }
      from = at + marker.length
    }
    if (best) break
  }
  return best
}

function composeAddress(zip, address, zip2, address2) {
  const parts = []
  const a1 = [zip, address].filter((x) => String(x || '').trim()).join(' ')
  const a2 = [zip2, address2].filter((x) => String(x || '').trim()).join(' ')
  if (a1) parts.push(a1.trim())
  if (a2) parts.push(a2.trim())
  return parts.join(' / ')
}

async function mapPool(items, concurrency, worker) {
  const results = new Array(items.length)
  let cursor = 0
  async function run() {
    while (cursor < items.length) {
      const i = cursor
      cursor += 1
      results[i] = await worker(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => run()))
  return results
}

function csvEscape(value) {
  const s = String(value ?? '')
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

const targetCharts = loadTargetCharts()
const all = await loadAllPatients()
writeFileSync(join(OUT_DIR, 'apotool-patient-ids.json'), JSON.stringify(all, null, 2))

const targets = targetCharts
  ? all.filter((p) => targetCharts.has(p.registration_number))
  : all

console.error(
  `targets: ${targets.length} / listed: ${all.length}` +
    (targetCharts ? ` (chart filter ${targetCharts.size})` : ' (all)'),
)

const rows = await mapPool(targets, CONCURRENCY, async (p, index) => {
  try {
    const res = await apoFetch(`/user/patient/edit/${p.id}`)
    const html = await res.text()
    if (!res.ok) {
      return {
        apotool_id: p.id,
        chart_number: p.registration_number,
        name: p.name,
        zip: '',
        address: '',
        zip2: '',
        address2: '',
        composed_address: '',
        tel: '',
        mobile_tel: '',
        ok: false,
        error: `HTTP ${res.status}`,
      }
    }
    const obj = extractPatientJson(html)
    if (!obj) {
      return {
        apotool_id: p.id,
        chart_number: p.registration_number,
        name: p.name,
        zip: '',
        address: '',
        zip2: '',
        address2: '',
        composed_address: '',
        tel: '',
        mobile_tel: '',
        ok: false,
        error: 'json_not_found',
      }
    }
    const composed = composeAddress(obj.zip, obj.address, obj.zip2, obj.address2)
    if ((index + 1) % 25 === 0 || index === 0) {
      console.error(`detail ${index + 1}/${targets.length}`)
    }
    return {
      apotool_id: String(obj.id || p.id),
      chart_number: String(obj.registration_number ?? p.registration_number),
      name: String(obj.name || p.name || ''),
      zip: String(obj.zip || ''),
      address: String(obj.address || ''),
      zip2: String(obj.zip2 || ''),
      address2: String(obj.address2 || ''),
      composed_address: composed,
      tel: String(obj.tel || ''),
      mobile_tel: String(obj.mobile_tel || ''),
      ok: true,
      error: '',
    }
  } catch (err) {
    return {
      apotool_id: p.id,
      chart_number: p.registration_number,
      name: p.name,
      zip: '',
      address: '',
      zip2: '',
      address2: '',
      composed_address: '',
      tel: '',
      mobile_tel: '',
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
})

const header = [
  'apotool_id',
  'chart_number',
  'name',
  'zip',
  'address',
  'zip2',
  'address2',
  'composed_address',
  'tel',
  'mobile_tel',
  'ok',
  'error',
]
const lines = [
  header.join(','),
  ...rows.map((row) => header.map((key) => csvEscape(row[key])).join(',')),
]
const csvPath = join(OUT_DIR, 'apotool-patient-addresses.csv')
writeFileSync(csvPath, `\uFEFF${lines.join('\n')}`, 'utf8')
writeFileSync(join(OUT_DIR, 'apotool-patient-addresses.json'), JSON.stringify(rows, null, 2))

const withAddr = rows.filter((r) => r.ok && r.composed_address).length
const failed = rows.filter((r) => !r.ok).length
console.error(`done: ${rows.length} rows, with_address=${withAddr}, failed=${failed}`)
console.error(`csv: ${csvPath}`)
