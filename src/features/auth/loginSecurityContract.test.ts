import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  isAllowlistedPublicAuthMessage,
  isSafeMfaQrSrc,
  LOGIN_PUBLIC_ERROR_MESSAGES,
} from './loginSecurityContract.ts'

describe('isAllowlistedPublicAuthMessage', () => {
  it('固定日本語だけを許可する', () => {
    for (const message of LOGIN_PUBLIC_ERROR_MESSAGES) {
      assert.equal(isAllowlistedPublicAuthMessage(message), true)
    }
  })

  it('Auth 生メッセージや HTML は許可しない', () => {
    assert.equal(isAllowlistedPublicAuthMessage('Invalid login credentials'), false)
    assert.equal(isAllowlistedPublicAuthMessage('<script>alert(1)</script>'), false)
    assert.equal(isAllowlistedPublicAuthMessage("' OR 1=1 --"), false)
  })
})

describe('isSafeMfaQrSrc', () => {
  it('PNG / JPEG の data URI は許可する', () => {
    assert.equal(isSafeMfaQrSrc('data:image/png;base64,iVBORw0KGgo='), true)
    assert.equal(isSafeMfaQrSrc('data:image/jpeg;base64,/9j/4AAQ='), true)
  })

  it('スクリプトを含まない SVG data URI は許可する', () => {
    const svg = 'data:image/svg+xml;utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg"></svg>')
    assert.equal(isSafeMfaQrSrc(svg), true)
  })

  it('javascript: と HTML data URI と script 付き SVG は拒否する', () => {
    assert.equal(isSafeMfaQrSrc('javascript:alert(1)'), false)
    assert.equal(isSafeMfaQrSrc('data:text/html,<script>alert(1)</script>'), false)
    assert.equal(
      isSafeMfaQrSrc('data:image/svg+xml;utf-8,' + encodeURIComponent('<svg><script>alert(1)</script></svg>')),
      false,
    )
    assert.equal(isSafeMfaQrSrc('https://evil.example/qr.svg'), false)
    assert.equal(isSafeMfaQrSrc(''), false)
  })
})
