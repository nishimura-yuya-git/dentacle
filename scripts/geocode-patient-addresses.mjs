#!/usr/bin/env node
/**
 * 患者住所を国土地理院 住所検索APIでジオコードし、patients.latitude / longitude を埋める。
 * 距離行列（travelMinutesMatrix）の根拠になる。生住所・座標はログに出さない（件数のみ）。
 *
 * 直接更新（サービスロールキーがある場合）:
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/geocode-patient-addresses.mjs --clinic-id=...
 *
 * MCP execute_sql 用（キーが無い場合）:
 *   1. MCP で対象患者を JSON 取得して --in= に渡す（[{"id":"...","address":"..."}]）
 *   2. node scripts/geocode-patient-addresses.mjs --in=/tmp/patients.json --emit-sql-dir=/tmp/geocode
 *   3. 出力された batch-*.sql を MCP execute_sql で流す
 */
import { createClient } from '@supabase/supabase-js'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const GSI_ENDPOINT = 'https://msearch.gsi.go.jp/address-search/AddressSearch'
const REQUEST_INTERVAL_MS = 200
const SQL_BATCH_SIZE = 50

function parseArgs(argv) {
  const out = { clinicId: null, inPath: null, emitSqlDir: null, limit: null }
  for (const arg of argv) {
    if (arg.startsWith('--clinic-id=')) out.clinicId = arg.slice('--clinic-id='.length)
    else if (arg.startsWith('--in=')) out.inPath = arg.slice('--in='.length)
    else if (arg.startsWith('--emit-sql-dir=')) out.emitSqlDir = arg.slice('--emit-sql-dir='.length)
    else if (arg.startsWith('--limit=')) out.limit = Number(arg.slice('--limit='.length))
  }
  return out
}

/** 郵便番号・空白などを取り除き、検索に通りやすい住所へ整える */
export function normalizeAddressForGeocode(raw) {
  return String(raw || '')
    .replace(/〒?\s*\d{3}-?\d{4}\s*/g, '')
    .replace(/[\s\u3000]+/g, '')
    .trim()
}

async function geocodeAddress(address) {
  const query = normalizeAddressForGeocode(address)
  if (!query) return null
  const url = `${GSI_ENDPOINT}?q=${encodeURIComponent(query)}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) return null
  const features = await res.json().catch(() => null)
  if (!Array.isArray(features) || features.length === 0) return null
  const coords = features[0]?.geometry?.coordinates
  if (!Array.isArray(coords) || coords.length < 2) return null
  const [longitude, latitude] = coords
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  return {
    latitude: Number(latitude.toFixed(7)),
    longitude: Number(longitude.toFixed(7)),
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function geocodeAll(rows, limit) {
  const targets = typeof limit === 'number' && limit > 0 ? rows.slice(0, limit) : rows
  const resolved = []
  const failedIds = []
  for (const row of targets) {
    const coords = await geocodeAddress(row.address)
    if (coords) {
      resolved.push({ id: row.id, ...coords })
    } else {
      failedIds.push(row.id)
    }
    await sleep(REQUEST_INTERVAL_MS)
  }
  return { resolved, failedIds }
}

function buildUpdateSql(batch) {
  const values = batch
    .map((row) => `('${row.id}'::uuid, ${row.latitude}, ${row.longitude})`)
    .join(',\n  ')
  return `
update public.patients as p
set latitude = v.latitude,
    longitude = v.longitude,
    updated_at = now()
from (values
  ${values}
) as v(id, latitude, longitude)
where p.id = v.id;
`.trim()
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  let rows
  if (args.inPath) {
    rows = JSON.parse(readFileSync(args.inPath, 'utf8'))
  } else {
    const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey || !args.clinicId) {
      console.error(
        'SUPABASE_SERVICE_ROLE_KEY・VITE_SUPABASE_URL・--clinic-id= が必要です。または --in= で JSON を渡してください。',
      )
      process.exit(1)
    }
    const supabase = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await supabase
      .from('patients')
      .select('id, address')
      .eq('clinic_id', args.clinicId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .is('latitude', null)
      .not('address', 'is', null)
    if (error) {
      console.error(`患者の取得に失敗しました: ${error.message}`)
      process.exit(1)
    }
    rows = data ?? []
  }

  rows = rows.filter((row) => row?.id && String(row.address || '').trim())
  console.log(JSON.stringify({ targetCount: rows.length }))

  const { resolved, failedIds } = await geocodeAll(rows, args.limit)
  console.log(
    JSON.stringify({ geocoded: resolved.length, failed: failedIds.length }),
  )

  if (resolved.length === 0) return

  if (args.emitSqlDir) {
    mkdirSync(args.emitSqlDir, { recursive: true })
    let batchIndex = 0
    for (let i = 0; i < resolved.length; i += SQL_BATCH_SIZE) {
      batchIndex += 1
      const batch = resolved.slice(i, i + SQL_BATCH_SIZE)
      writeFileSync(
        `${args.emitSqlDir}/batch-${String(batchIndex).padStart(3, '0')}.sql`,
        buildUpdateSql(batch),
        'utf8',
      )
    }
    if (failedIds.length > 0) {
      writeFileSync(
        `${args.emitSqlDir}/failed-ids.json`,
        JSON.stringify(failedIds, null, 2),
        'utf8',
      )
    }
    console.log(JSON.stringify({ emittedBatches: batchIndex, dir: args.emitSqlDir }))
    return
  }

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  let updated = 0
  for (const row of resolved) {
    const { error } = await supabase
      .from('patients')
      .update({ latitude: row.latitude, longitude: row.longitude })
      .eq('id', row.id)
    if (!error) updated += 1
  }
  console.log(JSON.stringify({ updated, failed: failedIds.length }))
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
