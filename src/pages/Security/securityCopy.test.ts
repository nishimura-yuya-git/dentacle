import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  SECURITY_INTRO,
  SECURITY_NETWORK_NOTE,
  SECURITY_NETWORK_ROWS,
  SECURITY_SECTIONS,
} from './securityCopy.ts'

function allCopy(): string {
  const sectionText = SECURITY_SECTIONS.flatMap((section) => [
    section.title,
    ...section.paragraphs,
    section.callout?.title ?? '',
    section.callout?.body ?? '',
    section.callout?.link.label ?? '',
    section.linkGroupLabel ?? '',
    ...(section.links ?? []).map((link) => link.label),
  ]).join('\n')
  return [
    SECURITY_INTRO,
    sectionText,
    SECURITY_NETWORK_NOTE,
    ...SECURITY_NETWORK_ROWS.map((row) => `${row.endpoint} ${row.purpose} ${row.when}`),
  ].join('\n')
}

describe('安全性ページの文言', () => {
  it('Nani の翻訳非保存・OAuth・Stripe をそのまま書かない', () => {
    const copy = allCopy()
    assert.equal(/永続ストレージには保存しません/.test(copy), false)
    assert.equal(/OAuth 2\.0/.test(copy), false)
    assert.equal(/Stripe/.test(copy), false)
    assert.equal(/PCI DSS/.test(copy), false)
  })

  it('デンタクルの実仕様（保存・RLS・銀行振替・TOTP・AI範囲）を書く', () => {
    const copy = allCopy()
    assert.match(copy, /データベースへ保存/)
    assert.match(copy, /行レベルセキュリティ/)
    assert.match(copy, /銀行振替/)
    assert.match(copy, /Authenticator/)
    assert.match(copy, /氏名・電話番号・生住所を AI へ送りません/)
    assert.match(copy, /Cursor SDK/)
  })

  it('企業ネットワークの囲み見出しを持つ', () => {
    const infra = SECURITY_SECTIONS.find((section) => section.id === 'infra')
    assert.equal(infra?.callout?.title, '企業ネットワークで利用する場合')
    assert.match(infra?.callout?.body ?? '', /EDR/)
  })

  it('院内許可リストはブラウザが直接話す先だけにする', () => {
    const joined = SECURITY_NETWORK_ROWS.map((row) => row.endpoint).join('\n')
    assert.match(joined, /supabase\.co/)
    assert.match(joined, /fonts\.googleapis\.com/)
    assert.equal(/github\.com/.test(joined), false)
    assert.equal(/api\.cursor/.test(joined), false)
    assert.match(SECURITY_NETWORK_NOTE, /サーバー側/)
  })
})
