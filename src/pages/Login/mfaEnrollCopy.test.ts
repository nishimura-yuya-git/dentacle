import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  MFA_AUTHENTICATOR_ICON_SRC,
  MFA_AUTHENTICATOR_STORE_LINKS,
  MFA_ENROLL_LEAD,
  MFA_ENROLL_STEPS,
  isAllowedAuthenticatorStoreHref,
} from './mfaEnrollCopy.ts'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..')

describe('運営 MFA 初回登録の案内', () => {
  it('iPhone 専用にせず、手順は3つに収める', () => {
    assert.match(MFA_ENROLL_LEAD, /iPhone でも Android/)
    assert.doesNotMatch(MFA_ENROLL_LEAD, /iPhoneのみ|iPhoneだけ/)
    assert.equal(MFA_ENROLL_STEPS.length, 3)
    assert.match(MFA_ENROLL_STEPS[0] ?? '', /認証アプリ/)
    assert.match(MFA_ENROLL_STEPS[0] ?? '', /他の認証アプリ/)
    assert.match(MFA_ENROLL_STEPS[1] ?? '', /QR/)
    assert.match(MFA_ENROLL_STEPS[2] ?? '', /6桁/)
  })

  it('入手リンクは App Store と Google Play の https だけ', () => {
    for (const link of MFA_AUTHENTICATOR_STORE_LINKS) {
      assert.equal(isAllowedAuthenticatorStoreHref(link.href), true, link.label)
    }
    assert.equal(isAllowedAuthenticatorStoreHref('http://apps.apple.com/jp/app/x'), false)
    assert.equal(isAllowedAuthenticatorStoreHref('https://example.com/app'), false)
  })

  it('店舗リンクのアイコンは public/icon の実在SVGで、パスに空白を入れない', () => {
    const apple = MFA_AUTHENTICATOR_STORE_LINKS.find((link) => link.label === 'App Store')
    const play = MFA_AUTHENTICATOR_STORE_LINKS.find((link) => link.label === 'Google Play')
    assert.equal(apple?.iconSrc, '/icon/apple-store.svg')
    assert.equal(play?.iconSrc, '/icon/google-play.svg')
    for (const link of MFA_AUTHENTICATOR_STORE_LINKS) {
      assert.equal(link.iconSrc.startsWith('/icon/'), true, link.label)
      assert.doesNotMatch(link.iconSrc, /\s/)
      const relative = link.iconSrc.replace(/^\//, '')
      assert.equal(existsSync(join(repoRoot, 'public', relative)), true, link.iconSrc)
    }
  })

  it('認証アプリの例示アイコンは public/icon の実在ファイルで、パスに空白を入れない', () => {
    assert.equal(MFA_AUTHENTICATOR_ICON_SRC.startsWith('/icon/'), true)
    assert.doesNotMatch(MFA_AUTHENTICATOR_ICON_SRC, /\s/)
    const relative = MFA_AUTHENTICATOR_ICON_SRC.replace(/^\//, '')
    assert.equal(existsSync(join(repoRoot, 'public', relative)), true)
  })
})
