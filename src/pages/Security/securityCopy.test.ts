import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  SECURITY_FOOTER_COLUMNS,
  SECURITY_INTRO,
  SECURITY_NETWORK_NOTE,
  SECURITY_NETWORK_ROWS,
  SECURITY_RAIL_BLURBS,
  SECURITY_RAIL_CTA,
  SECURITY_RAIL_NAV,
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
    SECURITY_RAIL_CTA.label,
    ...SECURITY_RAIL_BLURBS,
    ...SECURITY_FOOTER_COLUMNS.flatMap((column) => [
      column.title,
      ...column.links.map((link) => link.label),
    ]),
  ].join('\n')
}

const here = dirname(fileURLToPath(import.meta.url))

function readSecuritySource(relativePath: string): string {
  return readFileSync(join(here, relativePath), 'utf8')
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

  it('院向け文言に Issue と書かない', () => {
    assert.equal(/issue/i.test(allCopy()), false)
  })

  it('レセコン連携はいまのCSVと導入に備えた安全条件を書き、監視SaaS名を出さない', () => {
    const rececon = SECURITY_SECTIONS.find((section) => section.id === 'rececon')
    assert.ok(rececon)
    const text = rececon.paragraphs.join('\n')
    assert.match(text, /個人別全集計/)
    assert.match(text, /まだ開いていません/)
    assert.match(text, /医院LANに入らないことが前提ではありません/)
    assert.match(text, /TLS 1\.3/)
    assert.match(text, /443/)
    assert.match(text, /データベースの接続ポートは開きません/)
    assert.match(text, /書き込みは、別契約/)
    assert.match(text, /保険証/)
    assert.match(text, /医療情報システムの安全管理に関するガイドライン/)
    assert.match(text, /操作ログ/)
    assert.match(text, /種まき/)
    assert.equal(/準拠しています/.test(allCopy()), false)
    assert.equal(/準拠したデータ運用/.test(allCopy()), false)
    assert.equal(/Datadog/i.test(allCopy()), false)
    assert.equal(/Sentry/i.test(allCopy()), false)
  })

  it('安全性の各節にアンカー id を付ける', () => {
    const source = readSecuritySource('sections/SecuritySectionBlock.tsx')
    assert.match(source, /id=\{section\.id\}/)
  })

  it('Nani の翻訳コピーや装飾英語をレールに置かない', () => {
    const copy = allCopy()
    assert.equal(/あたらしく翻訳/.test(copy), false)
    assert.equal(/端末上に保存/.test(copy), false)
    assert.equal(SECURITY_RAIL_CTA.label, 'カレンダーへ戻る')
  })

  it('レールとフッターにヘルプを置く', () => {
    assert.equal(
      SECURITY_RAIL_NAV.some((item) => item.href === '/help' && item.label === 'ヘルプ'),
      true,
    )
    const support = SECURITY_FOOTER_COLUMNS.find((column) => column.title === 'サポート')
    assert.equal(
      support?.links.some((item) => item.href === '/help' && item.label === 'ヘルプ'),
      true,
    )
  })
})

describe('安全性ページの面', () => {
  it('業務ダッシュボード枠を使わない', () => {
    for (const file of ['SecurityPage.tsx', 'SecurityNetworkPage.tsx']) {
      const source = readSecuritySource(file)
      assert.equal(source.includes('DashboardLayout'), false, file)
    }
  })

  it('業務ナビと同じ w-56 レールと白パネルを使う', () => {
    const layout = readFileSync(join(here, '../../components/layout/SecurityLayout.tsx'), 'utf8')
    assert.match(layout, /\bw-56\b/)
    assert.match(layout, /rounded-\[32px\]/)
    assert.match(layout, /#F8FBF8/)
    assert.match(layout, /surface = 'article'/)
    assert.equal(layout.includes('FeedbackChatLauncher'), false)
  })

  it('見た目確認用プレビューは開発時だけ公開する', () => {
    const app = readFileSync(join(here, '../../App.tsx'), 'utf8')
    assert.match(app, /import\.meta\.env\.DEV/)
    assert.match(app, /\/__preview__\/security/)
  })
})
