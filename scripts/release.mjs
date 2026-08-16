#!/usr/bin/env node
/**
 * 製品版の確認・上げ・タグ打ち。
 *
 *   pnpm run version:check
 *   pnpm run release -- draft
 *   pnpm run release -- bump minor
 *   pnpm run release -- notes
 *   pnpm run release -- tag --push
 */
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import {
  applyVersionToChangelog,
  bumpSemver,
  collectVersionMismatches,
  extractChangelogSection,
  extractUnreleasedNotes,
  formatDraftNotes,
  formatGitTag,
  parseGitTag,
  parseSemver,
  pickLatestVersionTag,
  readAppVersionConst,
  replaceAppVersionConst,
  replacePackageJsonVersion,
  suggestBumpLevel,
  writeUnreleasedNotes,
} from './lib/app-version.mjs'

const PACKAGE_JSON_PATH = 'package.json'
const APP_VERSION_PATH = 'src/config/appVersion.ts'
const CHANGELOG_PATH = 'CHANGELOG.md'

function printHelp() {
  console.log(`製品版リリース CLI

使い方:
  node scripts/release.mjs check
  node scripts/release.mjs draft
  node scripts/release.mjs bump major|minor|patch
  node scripts/release.mjs notes [vX.Y.Z]
  node scripts/release.mjs tag [--push] [--allow-dirty] [--allow-branch]

check  … package.json / APP_VERSION / CHANGELOG が揃っているか確認
draft  … 前回の製品版タグ以降のコミットから CHANGELOG の未公開を書く
bump   … 版を上げ、未公開メモを CHANGELOG の新節へ移す（コミットはしない）
notes  … GitHub Release 用に CHANGELOG の該当節を出す
tag    … 現在の製品版で annotated タグを打つ。main 上・作業ツリーがきれいなときだけ
`)
}

function parseArgs(argv) {
  const args = argv.filter((token) => token !== '--')
  const command = args.shift() || 'help'
  const flags = new Set()
  const positionals = []

  for (const token of args) {
    if (token === '--help' || token === '-h') {
      return { command: 'help', flags, positionals }
    }
    if (token.startsWith('--')) {
      flags.add(token.slice(2))
      continue
    }
    positionals.push(token)
  }

  return { command, flags, positionals }
}

function loadSources() {
  return {
    packageJson: readFileSync(PACKAGE_JSON_PATH, 'utf8'),
    appVersion: readFileSync(APP_VERSION_PATH, 'utf8'),
    changelog: readFileSync(CHANGELOG_PATH, 'utf8'),
  }
}

function runCheck({ quiet = false } = {}) {
  const sources = loadSources()
  const packageVersion = JSON.parse(sources.packageJson).version
  const appVersion = readAppVersionConst(sources.appVersion)
  const result = collectVersionMismatches({
    packageVersion,
    appVersion,
    changelog: sources.changelog,
  })

  if (result.errors.length > 0) {
    for (const error of result.errors) {
      console.error(error)
    }
    process.exitCode = 1
    return null
  }

  if (!quiet) {
    console.log(`製品版 ${result.tag} は揃っています。`)
  }
  return result
}

function runBump(level) {
  if (!level) {
    console.error('bump には major / minor / patch を指定してください。')
    process.exitCode = 1
    return
  }

  const sources = loadSources()
  const current = parseSemver(JSON.parse(sources.packageJson).version).version
  const next = bumpSemver(current, level)
  const notes = extractUnreleasedNotes(sources.changelog)
  const date = new Date().toISOString().slice(0, 10)

  let changelog
  try {
    changelog = applyVersionToChangelog(sources.changelog, {
      version: next,
      date,
      notes,
    })
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
    return
  }

  writeFileSync(PACKAGE_JSON_PATH, replacePackageJsonVersion(sources.packageJson, next))
  writeFileSync(APP_VERSION_PATH, replaceAppVersionConst(sources.appVersion, next))
  writeFileSync(CHANGELOG_PATH, changelog)

  console.log(`${formatGitTag(current)} → ${formatGitTag(next)}`)
  console.log('差分を確認してコミットしてください。タグは pnpm run release -- tag')
}

function resolveNotesVersion(value, packageVersion) {
  if (!value) return parseSemver(packageVersion).version
  return String(value).startsWith('v') ? parseGitTag(value) : parseSemver(value).version
}

function runNotes(versionOrTag) {
  const sources = loadSources()
  const packageVersion = JSON.parse(sources.packageJson).version
  const version = resolveNotesVersion(versionOrTag, packageVersion)
  const section = extractChangelogSection(sources.changelog, version)
  if (!section) {
    console.log(`${formatGitTag(version)} の変更内容は CHANGELOG.md を参照してください。`)
    return
  }
  console.log(section)
}

function git(args, options = {}) {
  return spawnSync('git', args, {
    encoding: 'utf8',
    stdio: options.stdio ?? ['ignore', 'pipe', 'pipe'],
  })
}

function listVersionTags() {
  const listed = git(['tag', '-l', 'v*.*.*'])
  if (listed.status !== 0) return []
  return listed.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function commitTitlesSince(tag) {
  const range = tag ? `${tag}..HEAD` : 'HEAD'
  const log = git(['log', range, '--pretty=format:%s'])
  if (log.status !== 0) return []
  return log.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function runDraft() {
  const latestTag = pickLatestVersionTag(listVersionTags())
  if (!latestTag) {
    console.log('製品版タグがまだありません。初回は bump せず、pnpm run version:check のあと pnpm run release -- tag --push だけです。')
    return
  }

  const sources = loadSources()
  const existing = extractUnreleasedNotes(sources.changelog)
  if (existing) {
    console.error('未公開に既にメモがあります。空にしてから draft するか、そのまま bump してください。')
    process.exitCode = 1
    return
  }

  const titles = commitTitlesSince(latestTag)
  const notes = formatDraftNotes(titles)
  if (!notes) {
    console.error(`${latestTag} 以降のコミットから、公開メモを作れませんでした。`)
    process.exitCode = 1
    return
  }

  try {
    writeFileSync(CHANGELOG_PATH, writeUnreleasedNotes(sources.changelog, notes))
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
    return
  }

  console.log(`${latestTag} 以降のコミットから未公開を書きました。`)
  console.log(`suggested-bump: ${suggestBumpLevel(titles)}`)
}

function runTag({ push, allowDirty, allowBranch }) {
  const checked = runCheck({ quiet: true })
  if (!checked) return

  const dirty = git(['status', '--porcelain'])
  if (dirty.stdout.trim() && !allowDirty) {
    console.error('作業ツリーが汚いのでタグを打ちません。コミットしてから再実行してください。')
    process.exitCode = 1
    return
  }

  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']).stdout.trim()
  if (branch !== 'main' && !allowBranch) {
    console.error(`main 以外（${branch}）ではタグを打ちません。--allow-branch で上書きできます。`)
    process.exitCode = 1
    return
  }

  const existing = git(['rev-parse', '-q', '--verify', `refs/tags/${checked.tag}`])
  if (existing.status === 0) {
    console.error(`${checked.tag} は既にあります。`)
    process.exitCode = 1
    return
  }

  const tagged = git(['tag', '-a', checked.tag, '-m', `Dentacle ${checked.tag}`], {
    stdio: 'inherit',
  })
  if (tagged.status !== 0) {
    process.exitCode = tagged.status ?? 1
    return
  }

  if (!push) {
    console.log(`次: git push origin ${checked.tag}`)
    return
  }

  const pushed = git(['push', 'origin', checked.tag], { stdio: 'inherit' })
  if (pushed.status !== 0) {
    process.exitCode = pushed.status ?? 1
    return
  }
  console.log(`${checked.tag} を push しました。GitHub Release は workflow が作ります。`)
}

const parsed = parseArgs(process.argv.slice(2))

switch (parsed.command) {
  case 'check':
    runCheck()
    break
  case 'draft':
    runDraft()
    break
  case 'bump':
    runBump(parsed.positionals[0])
    break
  case 'notes':
    runNotes(parsed.positionals[0])
    break
  case 'tag':
    runTag({
      push: parsed.flags.has('push'),
      allowDirty: parsed.flags.has('allow-dirty'),
      allowBranch: parsed.flags.has('allow-branch'),
    })
    break
  case 'help':
    printHelp()
    break
  default:
    printHelp()
    process.exitCode = 1
    break
}
