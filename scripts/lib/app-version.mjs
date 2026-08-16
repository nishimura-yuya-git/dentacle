/**
 * 製品版（SemVer）の共通処理。
 * 院向けお知らせの update #N や、DB 楽観ロック version 列とは別。
 */

export const UNRELEASED_HEADING = '未公開'
export const TAG_PREFIX = 'v'
export const SEMVER_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/
export const APP_VERSION_CONST_RE = /export const APP_VERSION = '([^']+)'/

const VERSION_LINE_RE = /"version"\s*:\s*"[^"]+"/
const BUMP_LEVELS = new Set(['major', 'minor', 'patch'])

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function parseSemver(value) {
  const version = String(value || '').trim()
  const match = version.match(SEMVER_RE)
  if (!match) {
    throw new Error(`製品版は MAJOR.MINOR.PATCH だけ使います: ${value}`)
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    version: `${match[1]}.${match[2]}.${match[3]}`,
  }
}

export function formatGitTag(version) {
  return `${TAG_PREFIX}${parseSemver(version).version}`
}

export function parseGitTag(tag) {
  const value = String(tag || '').trim()
  if (!value.startsWith(TAG_PREFIX)) {
    throw new Error(`Git タグは vMAJOR.MINOR.PATCH です: ${tag}`)
  }
  return parseSemver(value.slice(TAG_PREFIX.length)).version
}

export function bumpSemver(version, level) {
  const parsed = parseSemver(version)
  if (!BUMP_LEVELS.has(level)) {
    throw new Error(`上げる単位は major / minor / patch です: ${level}`)
  }
  if (level === 'major') return `${parsed.major + 1}.0.0`
  if (level === 'minor') return `${parsed.major}.${parsed.minor + 1}.0`
  return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`
}

export function formatAppVersionLabel(version) {
  return formatGitTag(version)
}

export function replacePackageJsonVersion(source, version) {
  const next = parseSemver(version).version
  if (!VERSION_LINE_RE.test(source)) {
    throw new Error('package.json に version がありません')
  }
  return source.replace(VERSION_LINE_RE, `"version": "${next}"`)
}

export function replaceAppVersionConst(source, version) {
  const next = parseSemver(version).version
  if (!APP_VERSION_CONST_RE.test(source)) {
    throw new Error('appVersion.ts に APP_VERSION がありません')
  }
  return source.replace(APP_VERSION_CONST_RE, `export const APP_VERSION = '${next}'`)
}

export function readAppVersionConst(source) {
  const match = String(source || '').match(APP_VERSION_CONST_RE)
  if (!match) {
    throw new Error('APP_VERSION を読めません')
  }
  return parseSemver(match[1]).version
}

function findHeadingRange(lines, headingPattern) {
  let start = -1
  for (let index = 0; index < lines.length; index += 1) {
    if (headingPattern.test(lines[index])) {
      start = index
      break
    }
  }
  if (start < 0) return null

  let end = lines.length
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^## /.test(lines[index])) {
      end = index
      break
    }
  }
  return { start, end }
}

export function extractChangelogSection(markdown, version) {
  const target = parseSemver(version).version
  const headingRe = new RegExp(`^## (?:\\[${escapeRegExp(target)}\\]|${escapeRegExp(target)})(?:\\s|$)`)
  const lines = String(markdown || '').split(/\r?\n/)
  const range = findHeadingRange(lines, headingRe)
  if (!range) return null
  return lines.slice(range.start, range.end).join('\n').trim()
}

export function extractUnreleasedNotes(markdown) {
  const headingRe = new RegExp(`^## ${escapeRegExp(UNRELEASED_HEADING)}(?:\\s|$)`)
  const lines = String(markdown || '').split(/\r?\n/)
  const range = findHeadingRange(lines, headingRe)
  if (!range) return ''
  return lines.slice(range.start + 1, range.end).join('\n').trim()
}

export function applyVersionToChangelog(markdown, { version, date, notes }) {
  const target = parseSemver(version).version
  if (extractChangelogSection(markdown, target)) {
    throw new Error(`CHANGELOG に ${target} が既にあります`)
  }

  const body = String(notes || '').trim()
  if (!body) {
    throw new Error('未公開の変更メモが空です。CHANGELOG の「未公開」に書いてから上げてください。')
  }

  const headingRe = new RegExp(`^## ${escapeRegExp(UNRELEASED_HEADING)}(?:\\s|$)`)
  const lines = String(markdown || '').split(/\r?\n/)
  const range = findHeadingRange(lines, headingRe)
  if (!range) {
    throw new Error('CHANGELOG に ## 未公開 がありません')
  }

  const next = [
    ...lines.slice(0, range.start + 1),
    '',
    `## ${target} - ${date}`,
    '',
    ...body.split('\n'),
    '',
    ...lines.slice(range.end),
  ].join('\n')

  return next.replace(/\n{3,}/g, '\n\n').replace(/\s+$/, '\n')
}

export function collectVersionMismatches({ packageVersion, appVersion, changelog, tag }) {
  const version = parseSemver(packageVersion).version
  const errors = []

  if (parseSemver(appVersion).version !== version) {
    errors.push(`APP_VERSION (${appVersion}) と package.json (${packageVersion}) が違います`)
  }
  if (!extractChangelogSection(changelog, version)) {
    errors.push(`CHANGELOG.md に ${version} の節がありません`)
  }
  if (tag && parseGitTag(tag) !== version) {
    errors.push(`タグ ${tag} と製品版 ${version} が違います`)
  }

  return {
    version,
    tag: formatGitTag(version),
    errors,
  }
}
