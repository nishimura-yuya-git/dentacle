/**
 * レセコン系「個人別全集計」患者CSV の解析（種まき用）。
 * Apotoolエクスポートではない。会計列は無視する。個人情報をログに出さないこと。
 */

import { detectCsvDefaultYear } from './detectCsvYear.ts'

export type RawPatientCsvRow = {
  chartNumber: string
  nameKana: string
  nameKanji: string
  doctorCode: string
  doctorName: string
  primaryDoctorCode: string
  primaryDoctorName: string
  lastVisitRaw: string
  /** 診療回数 合計（任意列） */
  visitCount: number | null
  lineNumber: number
}

export type ParsePatientCsvResult = {
  headerLine: number
  rows: RawPatientCsvRow[]
  skippedEmptyLines: number
  warnings: string[]
  /** 期間行から推定した西暦年（無ければ null） */
  detectedYear: number | null
}

const REQUIRED_HEADERS = [
  'カルテ番号',
  '患者カナ氏名',
  '患者漢字氏名',
  'ドクター番号',
  'ドクター名',
  '主担当医番号',
  '主担当医名',
  '最終日付',
] as const

function splitCsvLine(line: string): string[] {
  const cells: string[] = []
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
  return cells.map((cell) => cell.trim())
}

export function parsePatientCsv(text: string): ParsePatientCsvResult {
  const normalized = text.replace(/^\uFEFF/, '')
  const lines = normalized.split(/\r?\n/)
  const warnings: string[] = []

  let headerLine = -1
  let header: string[] = []
  for (let i = 0; i < lines.length; i += 1) {
    const cells = splitCsvLine(lines[i] ?? '')
    if (cells[0] === 'カルテ番号') {
      headerLine = i
      header = cells
      break
    }
  }

  if (headerLine < 0) {
    throw new Error('ヘッダー行（カルテ番号…）が見つかりません。ファイル形式を確認してください。')
  }

  const missing = REQUIRED_HEADERS.filter((name) => !header.includes(name))
  if (missing.length > 0) {
    throw new Error(`必須列が不足しています: ${missing.join(', ')}`)
  }

  const index = Object.fromEntries(REQUIRED_HEADERS.map((name) => [name, header.indexOf(name)])) as Record<
    (typeof REQUIRED_HEADERS)[number],
    number
  >
  const visitCountIndex = header.indexOf('診療回数 合計')

  const rows: RawPatientCsvRow[] = []
  let skippedEmptyLines = 0

  for (let i = headerLine + 1; i < lines.length; i += 1) {
    const line = lines[i] ?? ''
    if (!line.trim()) {
      skippedEmptyLines += 1
      continue
    }
    const cells = splitCsvLine(line)
    const chartNumber = (cells[index['カルテ番号']] ?? '').trim()
    if (!chartNumber || !/^\d+$/.test(chartNumber)) {
      skippedEmptyLines += 1
      continue
    }

    const visitRaw =
      visitCountIndex >= 0 ? (cells[visitCountIndex] ?? '').trim().replace(/,/g, '') : ''
    const visitParsed = visitRaw === '' ? null : Number(visitRaw)
    const visitCount =
      visitParsed != null && Number.isFinite(visitParsed) ? visitParsed : null

    rows.push({
      chartNumber,
      nameKana: (cells[index['患者カナ氏名']] ?? '').trim(),
      nameKanji: (cells[index['患者漢字氏名']] ?? '').trim(),
      doctorCode: (cells[index['ドクター番号']] ?? '').trim(),
      doctorName: (cells[index['ドクター名']] ?? '').trim(),
      primaryDoctorCode: (cells[index['主担当医番号']] ?? '').trim(),
      primaryDoctorName: (cells[index['主担当医名']] ?? '').trim(),
      lastVisitRaw: (cells[index['最終日付']] ?? '').trim(),
      visitCount,
      lineNumber: i + 1,
    })
  }

  if (rows.length === 0) {
    warnings.push('有効な患者行がありませんでした。')
  }

  const detectedYear = detectCsvDefaultYear(normalized)
  if (detectedYear == null) {
    warnings.push('期間行から年を推定できませんでした。取込画面で年を指定してください。')
  }

  return {
    headerLine: headerLine + 1,
    rows,
    skippedEmptyLines,
    warnings,
    detectedYear,
  }
}
