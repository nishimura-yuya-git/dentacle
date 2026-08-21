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

  it('ログインは中央、MFAは小さく右側、パスワード設定は左側に置く', () => {
    for (const file of [
      '../../pages/Login/LoginPage.tsx',
      '../../pages/Login/SetPasswordPage.tsx',
    ]) {
      const source = readSource(file)
      assert.match(source, /AuthCardBrand/, file)
    }
    const brand = readSource('../../pages/Login/AuthCardBrand.tsx')
    assert.match(brand, /justify-start/)
    assert.match(brand, /justify-center/)
    assert.match(brand, /justify-end/)
    assert.match(brand, /authCompact/)
    const login = readSource('../../pages/Login/LoginPage.tsx')
    assert.match(login, /useWideLoginCard \? 'end' : 'center'/)
    const logo = readSource('BrandLogo.tsx')
    assert.match(logo, /auth: 'h-12/)
    assert.match(logo, /authCompact: 'h-9/)
  })
})
