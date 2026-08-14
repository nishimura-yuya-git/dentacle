import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { collectHelpFaqIds, HELP_HEADING, HELP_SECTIONS } from './helpCopy.ts'

const here = dirname(fileURLToPath(import.meta.url))

function allCopy(): string {
  const sectionText = HELP_SECTIONS.flatMap((section) => [
    section.title,
    ...section.items.flatMap((item) => [
      item.question,
      ...item.paragraphs,
      ...(item.bullets ?? []),
      ...(item.links ?? []).map((link) => link.label),
    ]),
  ]).join('\n')
  return [HELP_HEADING, sectionText].join('\n')
}

describe('ヘルプの文言', () => {
  it('Nani の翻訳非保存・OAuth・Stripe・Pro を書かない', () => {
    const copy = allCopy()
    assert.equal(/端末上に保存/.test(copy), false)
    assert.equal(/OAuth/.test(copy), false)
    assert.equal(/Stripe/.test(copy), false)
    assert.equal(/Apple Pay/.test(copy), false)
    assert.equal(/\bPro\b/.test(copy), false)
    assert.equal(/あたらしく翻訳/.test(copy), false)
  })

  it('デンタクルの実仕様を書く', () => {
    const copy = allCopy()
    assert.match(copy, /訪問歯科/)
    assert.match(copy, /行レベルセキュリティ/)
    assert.match(copy, /銀行振替/)
    assert.match(copy, /氏名・電話番号・生住所をAIへ送りません/)
    assert.match(copy, /種まき/)
    assert.match(copy, /個人別全集計/)
  })

  it('院向け文言に Issue と書かない', () => {
    assert.equal(/issue/i.test(allCopy()), false)
  })

  it('項目 id は一意で、セクションから集められる', () => {
    const ids = collectHelpFaqIds(HELP_SECTIONS)
    assert.equal(new Set(ids).size, ids.length)
    assert.ok(ids.includes('what'))
    assert.ok(ids.includes('rececon'))
    assert.ok(ids.includes('network'))
  })
})

describe('ヘルプページの面', () => {
  it('業務ダッシュボード枠を使わず、文書シェルの plain 面を使う', () => {
    const page = readFileSync(join(here, 'HelpPage.tsx'), 'utf8')
    assert.equal(page.includes('DashboardLayout'), false)
    assert.match(page, /surface="plain"/)
    assert.equal(page.includes('FeedbackChatLauncher'), false)
  })

  it('見た目確認用プレビューは開発時だけ公開する', () => {
    const app = readFileSync(join(here, '../../App.tsx'), 'utf8')
    assert.match(app, /import\.meta\.env\.DEV/)
    assert.match(app, /\/__preview__\/help/)
  })

  it('セクション見出しは井戸の内側に置き、左右のふちは細くする', () => {
    const source = readFileSync(join(here, 'sections/HelpFaqSection.tsx'), 'utf8')
    assert.match(source, /rounded-\[28px\]/)
    assert.match(source, /px-1\.5/)
    assert.match(source, /section\.title/)
    const headingIndex = source.indexOf('section.title')
    const wellIndex = source.indexOf('rounded-[28px]')
    const cardIndex = source.indexOf('rounded-[20px]')
    assert.ok(wellIndex > 0 && headingIndex > wellIndex, '見出しが井戸より前にある')
    assert.ok(cardIndex > headingIndex, '白カードが見出しより前にある')
  })
})
