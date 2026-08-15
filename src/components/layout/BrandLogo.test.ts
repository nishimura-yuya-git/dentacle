import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

function readSource(relativePath: string): string {
  return readFileSync(join(here, relativePath), 'utf8')
}

describe('BrandLogo', () => {
  it('公式ロゴパスと日本語 alt を使う', () => {
    const source = readSource('BrandLogo.tsx')
    assert.match(source, /BRAND_LOGO_SRC = '\/icon\/logo\.png'/)
    assert.match(source, /alt=\{env\.appName\}/)
  })

  it('業務枠と文書シェルのブランドを画像にする', () => {
    for (const file of [
      'AppSidebar.tsx',
      'DashboardLayout.tsx',
      'SecurityLayout.tsx',
      '../../pages/Security/sections/SecurityRail.tsx',
      '../../pages/Security/sections/SecuritySiteFooter.tsx',
    ]) {
      const source = readSource(file)
      assert.match(source, /BrandLogo/, file)
      assert.equal(source.includes('ロゴ差し替え予定'), false, file)
    }
  })

  it('ログイン画面にはロゴを置かない', () => {
    const source = readSource('../../pages/Login/LoginPage.tsx')
    assert.equal(source.includes('BrandLogo'), false)
    assert.equal(source.includes('/icon/logo.png'), false)
  })
})
