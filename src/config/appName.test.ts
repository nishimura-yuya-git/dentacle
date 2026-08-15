import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { APP_DISPLAY_NAME } from './appName.ts'
import { HELP_SECTIONS } from '../pages/Help/helpCopy.ts'
import {
  SECURITY_FOOTER_COLUMNS,
  SECURITY_HEADING,
  SECURITY_INTRO,
  SECURITY_NETWORK_INTRO,
  SECURITY_NETWORK_ROWS,
  SECURITY_SECTIONS,
} from '../pages/Security/securityCopy.ts'

const here = dirname(fileURLToPath(import.meta.url))

function visibleCopy(): string {
  const help = HELP_SECTIONS.flatMap((section) =>
    section.items.flatMap((item) => [item.question, ...item.paragraphs]),
  ).join('\n')
  const security = [
    SECURITY_HEADING,
    SECURITY_INTRO,
    SECURITY_NETWORK_INTRO,
    ...SECURITY_NETWORK_ROWS.map((row) => row.endpoint),
    ...SECURITY_SECTIONS.flatMap((section) => section.paragraphs),
    ...SECURITY_FOOTER_COLUMNS.map((column) => column.title),
  ].join('\n')
  return `${help}\n${security}`
}

describe('APP_DISPLAY_NAME', () => {
  it('対外名は Dentacle で、カタカナに戻さない', () => {
    assert.equal(APP_DISPLAY_NAME, 'Dentacle')
    assert.equal(/デンタクル/.test(visibleCopy()), false)
    assert.match(visibleCopy(), /Dentacle/)
  })

  it('タブタイトルと表示名の既定も Dentacle にする', () => {
    const html = readFileSync(join(here, '../../index.html'), 'utf8')
    const envSource = readFileSync(join(here, 'env.ts'), 'utf8')
    assert.match(html, /<title>Dentacle｜/)
    assert.equal(html.includes('デンタクル'), false)
    assert.match(envSource, /APP_DISPLAY_NAME/)
    assert.equal(envSource.includes("'デンタクル'"), false)
  })

  it('ファビコンは公式 ico を使う', () => {
    const html = readFileSync(join(here, '../../index.html'), 'utf8')
    assert.match(html, /href="\/icon\/favicon\.ico"/)
    assert.equal(html.includes('/vite.svg'), false)
  })
})
