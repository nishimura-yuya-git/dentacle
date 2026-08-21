import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  MFA_AUTHENTICATOR_STORE_LINKS,
  MFA_ENROLL_LEAD,
  MFA_ENROLL_STEPS,
  isAllowedAuthenticatorStoreHref,
} from './mfaEnrollCopy.ts'

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
})
