#!/usr/bin/env node
/**
 * doc/患者データ.csv をクリニックへ種まきする。
 * 個人情報はログに出さない（件数のみ）。
 *
 * 使い方:
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-patients-from-csv.mjs \
 *     --clinic-id=32fcf9f5-f05c-426f-9184-61f170d12c73
 *
 * SQL バッチ出力（MCP execute_sql 用）:
 *   node scripts/seed-patients-from-csv.mjs --clinic-id=... --emit-sql-dir=/tmp/dentacle-seed
 */
import { createClient } from '@supabase/supabase-js'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..')
const DEFAULT_CSV = join(repoRoot, 'doc/患者データ.csv')
const HIMAWARI_CLINIC_ID = '32fcf9f5-f05c-426f-9184-61f170d12c73'

function parseArgs(argv) {
  const out = {
    clinicId: HIMAWARI_CLINIC_ID,
    csvPath: DEFAULT_CSV,
    emitSqlDir: null,
    limit: null,
  }
  for (const arg of argv) {
    if (arg.startsWith('--clinic-id=')) out.clinicId = arg.slice('--clinic-id='.length)
    else if (arg.startsWith('--csv=')) out.csvPath = arg.slice('--csv='.length)
    else if (arg.startsWith('--emit-sql-dir=')) out.emitSqlDir = arg.slice('--emit-sql-dir='.length)
    else if (arg.startsWith('--limit=')) out.limit = Number(arg.slice('--limit='.length))
  }
  return out
}

function splitCsvLine(line) {
  const cells = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (ch === ',' && !inQuotes) {
      cells.push(current)
      current = ''
      continue
    }
    current += ch
  }
  cells.push(current)
  return cells
}

function detectYear(text) {
  const m = text.match(/令和\s*([０-９0-9]+)\s*年/)
  if (!m) return 2026
  const raw = m[1].replace(/[０-９]/g, (d) => String('０１２３４５６７８９'.indexOf(d)))
  const reiwa = Number(raw)
  return Number.isFinite(reiwa) ? 2018 + reiwa : 2026
}

function parseJapaneseMonthDay(raw, year) {
  const matched = raw.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日/)
  if (!matched) return null
  const month = Number(matched[1])
  const day = Number(matched[2])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function parseAndNormalize(text, { limit } = {}) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/)
  let headerLine = -1
  for (let i = 0; i < lines.length; i += 1) {
    if ((lines[i] ?? '').includes('カルテ番号') && (lines[i] ?? '').includes('患者漢字氏名')) {
      headerLine = i
      break
    }
  }
  if (headerLine < 0) throw new Error('CSVヘッダー行が見つかりません')

  const year = detectYear(text)
  const header = splitCsvLine(lines[headerLine] ?? '')
  const idx = (name) => header.indexOf(name)
  const required = [
    'カルテ番号',
    '患者カナ氏名',
    '患者漢字氏名',
    'ドクター番号',
    'ドクター名',
    '主担当医番号',
    '主担当医名',
    '最終日付',
  ]
  for (const name of required) {
    if (idx(name) < 0) throw new Error(`必須列がありません: ${name}`)
  }
  const visitIdx = idx('診療回数 合計')

  const staffMap = new Map()
  const patients = []
  for (let i = headerLine + 1; i < lines.length; i += 1) {
    const line = lines[i] ?? ''
    if (!line.trim()) continue
    const cells = splitCsvLine(line)
    const chartNumber = (cells[idx('カルテ番号')] ?? '').trim()
    if (!chartNumber || !/^\d+$/.test(chartNumber)) continue
    const nameKanji = (cells[idx('患者漢字氏名')] ?? '').trim()
    if (!nameKanji) continue
    const nameKana = (cells[idx('患者カナ氏名')] ?? '').trim()
    const doctorCode = (cells[idx('主担当医番号')] ?? '').trim() || (cells[idx('ドクター番号')] ?? '').trim()
    const doctorName = (cells[idx('主担当医名')] ?? '').trim() || (cells[idx('ドクター名')] ?? '').trim()
    const lastVisitRaw = (cells[idx('最終日付')] ?? '').trim()
    const visitRaw =
      visitIdx >= 0 ? (cells[visitIdx] ?? '').trim().replace(/,/g, '') : ''
    const visitParsed = visitRaw === '' ? null : Number(visitRaw)
    const visitCount =
      visitParsed != null && Number.isFinite(visitParsed) ? visitParsed : null

    if (doctorCode && doctorName) {
      staffMap.set(doctorCode, { externalCode: doctorCode, displayName: doctorName })
    }
    patients.push({
      chartNumber,
      nameKana,
      nameKanji,
      primaryDoctorCode: doctorCode || null,
      lastVisitDate: lastVisitRaw ? parseJapaneseMonthDay(lastVisitRaw, year) : null,
      visitCount,
      sourceLine: i + 1,
    })
    if (limit != null && patients.length >= limit) break
  }

  return { year, staff: [...staffMap.values()], patients }
}

function sqlString(value) {
  if (value == null) return 'null'
  return `'${String(value).replace(/'/g, "''")}'`
}

function buildStaffSql(clinicId, staff) {
  const values = staff
    .map(
      (s) =>
        `(${sqlString(clinicId)}, ${sqlString(s.displayName)}, 'doctor', ${sqlString(s.externalCode)}, true)`,
    )
    .join(',\n')
  return `
insert into public.staff_members (clinic_id, display_name, staff_type, external_code, is_active)
values
${values}
on conflict (clinic_id, external_code) where deleted_at is null and external_code is not null
do update set
  display_name = excluded.display_name,
  staff_type = 'doctor',
  is_active = true,
  updated_at = now();
`.trim()
}

function buildPatientBatchSql(clinicId, batch) {
  const patientValues = batch
    .map((p) => {
      const metadata =
        p.visitCount != null
          ? { visit_count: p.visitCount, seed_source: 'rececon_csv' }
          : { seed_source: 'rececon_csv' }
      return `(${sqlString(clinicId)}, ${sqlString(p.chartNumber)}, ${sqlString(p.nameKanji)}, ${sqlString(p.nameKana || null)}, ${sqlString(p.primaryDoctorCode)}, ${sqlString(JSON.stringify(metadata))}::jsonb, ${sqlString(p.lastVisitDate)})`
    })
    .join(',\n')

  return `
with src as (
  select * from (values
${patientValues}
  ) as t(clinic_id, chart_number, name_kanji, name_kana, doctor_code, metadata, last_visit_date)
),
resolved as (
  select
    s.clinic_id,
    s.chart_number,
    s.name_kanji,
    s.name_kana,
    s.metadata,
    s.last_visit_date::date as last_visit_date,
    sm.id as primary_doctor_id
  from src s
  left join public.staff_members sm
    on sm.clinic_id = s.clinic_id::uuid
   and sm.external_code = s.doctor_code
   and sm.deleted_at is null
),
upserted as (
  insert into public.patients (
    clinic_id, chart_number, name_kanji, name_kana, primary_doctor_id, metadata, is_active
  )
  select
    clinic_id::uuid,
    chart_number,
    name_kanji,
    nullif(name_kana, ''),
    primary_doctor_id,
    metadata,
    true
  from resolved
  on conflict (clinic_id, chart_number) where deleted_at is null and chart_number is not null
  do update set
    name_kanji = excluded.name_kanji,
    name_kana = excluded.name_kana,
    primary_doctor_id = excluded.primary_doctor_id,
    metadata = excluded.metadata,
    is_active = true,
    updated_at = now()
  returning id, clinic_id, chart_number
)
insert into public.patient_visit_conditions (
  clinic_id, patient_id, visit_frequency, preferred_weekdays, last_visit_date,
  is_provisional, phone_confirmation_required
)
select
  u.clinic_id,
  u.id,
  'unknown',
  '{}'::smallint[],
  r.last_visit_date,
  true,
  true
from upserted u
join resolved r on r.chart_number = u.chart_number
on conflict (patient_id) where deleted_at is null
do update set
  last_visit_date = excluded.last_visit_date,
  is_provisional = true,
  visit_frequency = 'unknown',
  updated_at = now();
`.trim()
}

async function seedViaServiceRole({ url, serviceKey, clinicId, staff, patients }) {
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  let staffUpserted = 0
  for (const person of staff) {
    const { data: existing } = await supabase
      .from('staff_members')
      .select('id')
      .eq('clinic_id', clinicId)
      .eq('external_code', person.externalCode)
      .is('deleted_at', null)
      .maybeSingle()
    if (existing?.id) {
      await supabase
        .from('staff_members')
        .update({
          display_name: person.displayName,
          staff_type: 'doctor',
          is_active: true,
        })
        .eq('id', existing.id)
    } else {
      const { error } = await supabase.from('staff_members').insert({
        clinic_id: clinicId,
        display_name: person.displayName,
        staff_type: 'doctor',
        external_code: person.externalCode,
      })
      if (error) throw error
    }
    staffUpserted += 1
  }

  let inserted = 0
  let updated = 0
  let conditions = 0
  for (const [index, patient] of patients.entries()) {
    if (index % 50 === 0) {
      console.log(`progress patients ${index}/${patients.length}`)
    }
    const metadata =
      patient.visitCount != null
        ? { visit_count: patient.visitCount, seed_source: 'rececon_csv' }
        : { seed_source: 'rececon_csv' }

    const { data: doctor } = patient.primaryDoctorCode
      ? await supabase
          .from('staff_members')
          .select('id')
          .eq('clinic_id', clinicId)
          .eq('external_code', patient.primaryDoctorCode)
          .is('deleted_at', null)
          .maybeSingle()
      : { data: null }

    const { data: existing } = await supabase
      .from('patients')
      .select('id')
      .eq('clinic_id', clinicId)
      .eq('chart_number', patient.chartNumber)
      .is('deleted_at', null)
      .maybeSingle()

    let patientId = existing?.id
    if (patientId) {
      const { error } = await supabase
        .from('patients')
        .update({
          name_kanji: patient.nameKanji,
          name_kana: patient.nameKana || null,
          primary_doctor_id: doctor?.id ?? null,
          is_active: true,
          metadata,
        })
        .eq('id', patientId)
      if (error) throw error
      updated += 1
    } else {
      const { data: created, error } = await supabase
        .from('patients')
        .insert({
          clinic_id: clinicId,
          chart_number: patient.chartNumber,
          name_kanji: patient.nameKanji,
          name_kana: patient.nameKana || null,
          primary_doctor_id: doctor?.id ?? null,
          metadata,
        })
        .select('id')
        .single()
      if (error || !created) throw error ?? new Error('insert failed')
      patientId = created.id
      inserted += 1
    }

    const { data: condition } = await supabase
      .from('patient_visit_conditions')
      .select('id')
      .eq('patient_id', patientId)
      .is('deleted_at', null)
      .maybeSingle()

    if (condition?.id) {
      const { error } = await supabase
        .from('patient_visit_conditions')
        .update({
          last_visit_date: patient.lastVisitDate,
          is_provisional: true,
          visit_frequency: 'unknown',
        })
        .eq('id', condition.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('patient_visit_conditions').insert({
        clinic_id: clinicId,
        patient_id: patientId,
        visit_frequency: 'unknown',
        preferred_weekdays: [],
        last_visit_date: patient.lastVisitDate,
        is_provisional: true,
        phone_confirmation_required: true,
      })
      if (error) throw error
    }
    conditions += 1
  }

  return { staffUpserted, inserted, updated, conditions }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const text = readFileSync(args.csvPath, 'utf8')
  const { year, staff, patients } = parseAndNormalize(text, { limit: args.limit })
  console.log(
    JSON.stringify({
      clinicId: args.clinicId,
      csvYear: year,
      staffCount: staff.length,
      patientCount: patients.length,
      mode: args.emitSqlDir ? 'emit-sql' : 'service-role',
    }),
  )

  if (args.emitSqlDir) {
    mkdirSync(args.emitSqlDir, { recursive: true })
    writeFileSync(join(args.emitSqlDir, '00-staff.sql'), `${buildStaffSql(args.clinicId, staff)}\n`)
    const batchSize = 40
    let batchIndex = 0
    for (let i = 0; i < patients.length; i += batchSize) {
      batchIndex += 1
      const batch = patients.slice(i, i + batchSize)
      const name = `patients-${String(batchIndex).padStart(3, '0')}.sql`
      writeFileSync(join(args.emitSqlDir, name), `${buildPatientBatchSql(args.clinicId, batch)}\n`)
    }
    console.log(JSON.stringify({ emittedBatches: batchIndex, dir: args.emitSqlDir }))
    return
  }

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.error(
      'SUPABASE_SERVICE_ROLE_KEY と VITE_SUPABASE_URL が必要です。または --emit-sql-dir= を使ってください。',
    )
    process.exit(1)
  }
  const result = await seedViaServiceRole({
    url,
    serviceKey,
    clinicId: args.clinicId,
    staff,
    patients,
  })
  console.log(JSON.stringify(result))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
