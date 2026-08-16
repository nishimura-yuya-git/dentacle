#!/usr/bin/env node
/**
 * 製品版 SemVer の単体テスト。
 * 期待値根拠: ユーザーが v0.20.0 形式の版管理を依頼し、
 * 正本を Git タグ、同期先を package.json / APP_VERSION / CHANGELOG とする方針。
 */
import { readFileSync } from 'node:fs'
import {
  applyVersionToChangelog,
  bumpSemver,
  collectVersionMismatches,
  extractChangelogSection,
  extractUnreleasedNotes,
  formatAppVersionLabel,
  formatGitTag,
  parseGitTag,
  parseSemver,
  readAppVersionConst,
  replaceAppVersionConst,
  replacePackageJsonVersion,
} from './lib/app-version.mjs'

let failed = 0

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    failed += 1
    console.error(`FAIL: ${message}`)
    console.error(`  expected: ${expected}`)
    console.error(`  actual:   ${actual}`)
    return
  }
  console.log(`PASS: ${message}`)
}

function assertThrows(fn, message) {
  try {
    fn()
    failed += 1
    console.error(`FAIL: ${message}`)
    console.error('  expected: throw')
  } catch {
    console.log(`PASS: ${message}`)
  }
}

{
  const parsed = parseSemver('0.20.0')
  assertEqual(parsed.version, '0.20.0', 'SemVer を分解できる')
  assertEqual(formatGitTag('0.20.0'), 'v0.20.0', 'タグは v を付ける')
  assertEqual(parseGitTag('v0.20.0'), '0.20.0', 'タグから版を戻せる')
  assertEqual(formatAppVersionLabel('0.1.0'), 'v0.1.0', '表示も v 付き')
}

{
  assertEqual(bumpSemver('0.1.0', 'patch'), '0.1.1', 'patch は末尾だけ増やす')
  assertEqual(bumpSemver('0.1.9', 'minor'), '0.2.0', 'minor は patch を 0 に戻す')
  assertEqual(bumpSemver('0.20.3', 'major'), '1.0.0', 'major は 1.0.0 へ進める')
}

{
  assertThrows(() => parseSemver('1.0'), '不完全な版は拒否する')
  assertThrows(() => parseSemver('v0.1.0'), 'v 付きは parseSemver では受けない')
  assertThrows(() => parseGitTag('0.1.0'), 'タグなし版は parseGitTag では受けない')
  assertThrows(() => bumpSemver('0.1.0', 'build'), '未知の上げ方は拒否する')
}

{
  const nextPkg = replacePackageJsonVersion('{\n  "version": "0.0.0"\n}\n', '0.1.0')
  assertEqual(nextPkg.includes('"version": "0.1.0"'), true, 'package.json の version だけ替える')
  const nextTs = replaceAppVersionConst("export const APP_VERSION = '0.0.0'\n", '0.1.0')
  assertEqual(readAppVersionConst(nextTs), '0.1.0', 'APP_VERSION 定数を替える')
}

{
  const changelog = `# 変更履歴

## 未公開

### 追加
- 次の機能

## 0.1.0 - 2026-08-16

### 追加
- 最初の版
`
  assertEqual(extractUnreleasedNotes(changelog).includes('次の機能'), true, '未公開メモを取れる')
  assertEqual(
    extractChangelogSection(changelog, '0.1.0')?.includes('最初の版') ?? false,
    true,
    '公開済み節を取れる',
  )
  assertEqual(extractChangelogSection(changelog, '9.9.9'), null, '無い節は null')

  const bumped = applyVersionToChangelog(changelog, {
    version: '0.2.0',
    date: '2026-08-17',
    notes: extractUnreleasedNotes(changelog),
  })
  assertEqual(extractUnreleasedNotes(bumped), '', '上げたあと未公開は空')
  assertEqual(bumped.includes('## 0.2.0 - 2026-08-17'), true, '新しい節を先頭近くに足す')
  assertEqual(bumped.includes('次の機能'), true, '未公開メモを新節へ移す')
  assertEqual(bumped.includes('最初の版'), true, '古い節は残す')
  assertThrows(
    () => applyVersionToChangelog(changelog, { version: '0.1.0', date: '2026-08-16', notes: '重複' }),
    '同じ版の節は二重に作らない',
  )
  assertThrows(
    () => applyVersionToChangelog(changelog, { version: '0.3.0', date: '2026-08-18', notes: '   ' }),
    '空メモでは上げない',
  )
}

{
  const ok = collectVersionMismatches({
    packageVersion: '0.1.0',
    appVersion: '0.1.0',
    changelog: '## 0.1.0 - 2026-08-16\n\n- 最初の版\n',
    tag: 'v0.1.0',
  })
  assertEqual(ok.errors.length, 0, '揃っているときはエラーなし')
  assertEqual(ok.tag, 'v0.1.0', '照合結果のタグ名')

  const ng = collectVersionMismatches({
    packageVersion: '0.1.0',
    appVersion: '0.2.0',
    changelog: '## 未公開\n',
    tag: 'v0.3.0',
  })
  assertEqual(ng.errors.length, 3, 'ズレと CHANGELOG 欠落を全部出す')
}

{
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
  const appSource = readFileSync('src/config/appVersion.ts', 'utf8')
  const changelog = readFileSync('CHANGELOG.md', 'utf8')
  const result = collectVersionMismatches({
    packageVersion: pkg.version,
    appVersion: readAppVersionConst(appSource),
    changelog,
  })
  assertEqual(result.errors.join(' / '), '', 'リポジトリ上の製品版も揃っている')
}

if (failed > 0) {
  console.error(`\n${failed} 件失敗`)
  process.exit(1)
}

console.log('\n製品版テストはすべて成功')
