import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { detectCsvDefaultYear } from './detectCsvYear.ts'
import { parsePatientCsv } from './parsePatientCsv.ts'
import { normalizePatientCsvRows, parseJapaneseMonthDay } from './normalizePatientCsv.ts'

const sample = `
管理集計,,,,,,,,
令和８年,,,,,,,,

カルテ番号,患者カナ氏名,患者漢字氏名,保険種別番号,保険種別名,保険区分名,ドクター番号,ドクター名,患者負担率,新患回数,再初診回数,再診回数,診療回数 合計,診療回数 保険,診療回数 自費,診療回数 その他,診療点数,入力点数,前回までの未収金 合計,前回までの未収金 保険,前回までの未収金 自費,前回までの未収金 その他,今回請求金額     合計,今回請求金額     保険,今回請求金額     自費,今回請求金額     その他,今回請求消費税   合計,今回請求消費税   保険,今回請求消費税   自費,今回請求消費税   自費（10%）,今回請求消費税   自費（8%）,今回請求消費税   その他,今回請求消費税   その他（10%）,今回請求消費税   その他（8%）,今回税込請求金額 合計,今回税込請求金額 保険,今回税込請求金額 自費,今回税込請求金額 自費（10%）,今回税込請求金額 自費（8%）,今回税込請求金額 その他,今回税込請求金額 その他（10%）,今回税込請求金額 その他（8%）,入金額           合計,入金額           保険,入金額           自費,入金額           その他,会計後の未収残   合計,会計後の未収残   保険,会計後の未収残   自費,会計後の未収残   その他,前回預り残,今回預り残,預り金引当       合計,預り金引当       保険,預り金引当       自費,預り金引当       その他,窓口預り残,主担当医番号,主担当医名,最終日付,最終時間
1001,ﾔﾏﾀﾞ ﾀﾛｳ,山田 太郎,1,社保,社保,23,佐藤 一郎,30,0,0,1,1,1,0,0,100,100,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,23,佐藤 一郎,6月8日,11:22
1002,ｽｽﾞｷ ﾊﾅｺ,鈴木 花子,1,社保,社保,72,田中 花,30,0,0,1,1,1,0,0,100,100,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,72,田中 花,12月1日,10:00
`.trim()

assert.equal(detectCsvDefaultYear('令和  ８年  ４月  １日'), 2026)
assert.equal(detectCsvDefaultYear('令和8年'), 2026)

const parsed = parsePatientCsv(sample)
assert.equal(parsed.rows.length, 2)
assert.equal(parsed.rows[0]?.chartNumber, '1001')
assert.equal(parsed.detectedYear, 2026)

assert.equal(parseJapaneseMonthDay('6月8日', 2026), '2026-06-08')
assert.equal(parseJapaneseMonthDay('12月1日', 2026), '2026-12-01')

const normalized = normalizePatientCsvRows(parsed.rows, { defaultYear: 2026 })
assert.equal(normalized.patients.length, 2)
assert.equal(normalized.staff.length, 2)
assert.equal(normalized.patients[0]?.lastVisitDate, '2026-06-08')
assert.equal(normalized.patients[0]?.externalId, null)
assert.ok(normalized.warnings.some((w) => w.includes('完成データではありません')))

/** 実ファイルは件数のみ検証（個人情報をログしない） */
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const realPath = join(repoRoot, 'doc/患者データ.csv')
const realText = readFileSync(realPath, 'utf8')
const realParsed = parsePatientCsv(realText)
assert.ok(realParsed.rows.length >= 100, '実CSVの解析件数が少なすぎます')
assert.equal(realParsed.detectedYear, 2026)
const realNormalized = normalizePatientCsvRows(realParsed.rows, {
  defaultYear: realParsed.detectedYear ?? 2026,
})
assert.equal(realNormalized.patients.length, realParsed.rows.length)
assert.equal(
  realNormalized.warnings.filter((w) => w.includes('最終日付を解釈できません')).length,
  0
)

console.log(
  `parsePatientCsv.test.ts: ok (synthetic=2, realRows=${realParsed.rows.length}, staff=${realNormalized.staff.length})`
)
