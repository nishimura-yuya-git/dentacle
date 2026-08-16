import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { APP_VERSION, formatAppVersionLabel } from './appVersion.ts'

const here = dirname(fileURLToPath(import.meta.url))

describe('APP_VERSION', () => {
  it('package.json の version と一致する', () => {
    const pkg = JSON.parse(readFileSync(join(here, '../../package.json'), 'utf8')) as {
      version: string
    }
    assert.equal(APP_VERSION, pkg.version)
  })

  it('表示は v を付ける', () => {
    assert.equal(formatAppVersionLabel('0.1.0'), 'v0.1.0')
    assert.equal(formatAppVersionLabel(), `v${APP_VERSION}`)
  })
})
