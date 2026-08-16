import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { isTrustedMapSvgMarkup } from './applyTrustedMapSvg.ts'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..')

describe('isTrustedMapSvgMarkup', () => {
  it('通常の svg は受け入れる', () => {
    assert.equal(
      isTrustedMapSvgMarkup('<svg xmlns="http://www.w3.org/2000/svg"><g /></svg>'),
      true,
    )
  })

  it('script と foreignObject は拒否する', () => {
    assert.equal(
      isTrustedMapSvgMarkup('<svg><script>alert(1)</script></svg>'),
      false,
    )
    assert.equal(
      isTrustedMapSvgMarkup('<svg><foreignObject><div /></foreignObject></svg>'),
      false,
    )
    assert.equal(isTrustedMapSvgMarkup('<div><svg></svg></div>'), false)
    assert.equal(isTrustedMapSvgMarkup('<html><body>x</body></html>'), false)
    assert.equal(isTrustedMapSvgMarkup(''), false)
  })

  it('同梱の Geolonia 地図は受け入れる', () => {
    const markup = readFileSync(join(repoRoot, 'public/icon/map-full.svg'), 'utf8')
    assert.equal(isTrustedMapSvgMarkup(markup), true)
  })
})

describe('AuthAuditJapanMap の取り込み', () => {
  it('innerHTML 代入を使わず applyTrustedMapSvg に渡す', () => {
    const source = readFileSync(
      join(repoRoot, 'src/pages/AuthAudit/AuthAuditJapanMap.tsx'),
      'utf8',
    )
    assert.match(source, /applyTrustedMapSvg/)
    assert.doesNotMatch(source, /\.innerHTML\s*=/)
    assert.doesNotMatch(source, /dangerouslySetInnerHTML/)
  })
})
