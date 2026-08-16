import type { RawPatientCsvRow } from '@/features/patientImport/parsePatientCsv'

export type NormalizedStaffSeed = {
  externalCode: string
  displayName: string
}

export type NormalizedPatientSeed = {
  chartNumber: string
  /** レセコン内部の安定患者ID。CSV種まきでは常に null */
  externalId: string | null
  nameKana: string
  nameKanji: string
  primaryDoctorCode: string | null
  lastVisitDate: string | null
  visitCount: number | null
  sourceLine: number
}

export type NormalizePatientCsvResult = {
  staff: NormalizedStaffSeed[]
  patients: NormalizedPatientSeed[]
  warnings: string[]
}

/**
 * 「6月8日」形式を ISO 日付へ。年は明示（レセコン期間の年を渡す）。
 */
export function parseJapaneseMonthDay(raw: string, year: number): string | null {
  const matched = raw.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日/)
  if (!matched) return null
  const month = Number(matched[1])
  const day = Number(matched[2])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** レセコンCSV由来の先頭「・」を除去する（漢字推定復元はしない） */
export function stripLeadingMiddleDot(name: string): string {
  return name.replace(/^・+/, '').trim()
}

export function normalizePatientCsvRows(
  rows: RawPatientCsvRow[],
  options?: { defaultYear?: number; limit?: number }
): NormalizePatientCsvResult {
  const defaultYear = options?.defaultYear ?? new Date().getFullYear()
  const limit = options?.limit
  const warnings: string[] = []
  const staffMap = new Map<string, NormalizedStaffSeed>()
  const patients: NormalizedPatientSeed[] = []

  const source = typeof limit === 'number' ? rows.slice(0, limit) : rows
  if (typeof limit === 'number' && rows.length > limit) {
    warnings.push(`先頭 ${limit} 件のみ正規化しました（全 ${rows.length} 件中）。`)
  }

  for (const row of source) {
    const doctorCode = row.primaryDoctorCode || row.doctorCode
    const doctorName = row.primaryDoctorName || row.doctorName
    if (doctorCode && doctorName) {
      staffMap.set(doctorCode, {
        externalCode: doctorCode,
        displayName: doctorName,
      })
    }

    const lastVisitDate = row.lastVisitRaw
      ? parseJapaneseMonthDay(row.lastVisitRaw, defaultYear)
      : null
    if (row.lastVisitRaw && !lastVisitDate) {
      warnings.push(`行 ${row.lineNumber}: 最終日付を解釈できませんでした（種まきでは空欄扱い）。`)
    }

    const nameKanji = stripLeadingMiddleDot(row.nameKanji)
    if (!nameKanji) {
      warnings.push(`行 ${row.lineNumber}: 漢字氏名が空のためスキップしました。`)
      continue
    }

    patients.push({
      chartNumber: row.chartNumber,
      externalId: null,
      nameKana: row.nameKana,
      nameKanji,
      primaryDoctorCode: doctorCode || null,
      lastVisitDate,
      visitCount: row.visitCount,
      sourceLine: row.lineNumber,
    })
  }

  warnings.push(
    'CSVは訪問条件の完成データではありません。頻度・可能曜日・住所等は後追い入力 / 電話確認で育成してください。'
  )

  return {
    staff: [...staffMap.values()],
    patients,
    warnings,
  }
}
