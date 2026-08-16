import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PRIVACY_HEADING, PRIVACY_INTRO, PRIVACY_SECTIONS } from './privacyCopy.ts'

const here = dirname(fileURLToPath(import.meta.url))

function allCopy(): string {
  return [
    PRIVACY_HEADING,
    PRIVACY_INTRO,
    ...PRIVACY_SECTIONS.flatMap((section) => [
      section.title,
      ...section.paragraphs,
      section.callout?.body ?? '',
    ]),
  ].join('\n')
}

describe('個人情報の取り扱いの文言', () => {
  it('医院が利用目的を決め、所在地と委託先を書き、準拠済みとは書かない', () => {
    const copy = allCopy()
    assert.match(copy, /利用目的を決めるのは医院/)
    assert.match(copy, /シンガポール/)
    assert.match(copy, /Supabase/)
    assert.match(copy, /Vercel/)
    assert.match(copy, /ログイン画面には置きません/)
    assert.match(copy, /5 年/)
    assert.match(copy, /90 日/)
    assert.match(copy, /24 時間/)
    assert.equal(/準拠しています/.test(copy), false)
    assert.equal(/準拠したデータ運用/.test(copy), false)
    assert.equal(/issue/i.test(copy), false)
    assert.equal(/Datadog/i.test(copy), false)
  })
})

describe('個人情報ページの面', () => {
  it('業務ダッシュボード枠を使わない', () => {
    const page = readFileSync(join(here, 'PrivacyPage.tsx'), 'utf8')
    assert.equal(page.includes('DashboardLayout'), false)
    assert.match(page, /SecurityLayout/)
  })

  it('見た目確認用プレビューは開発時だけ公開する', () => {
    const app = readFileSync(join(here, '../../App.tsx'), 'utf8')
    assert.match(app, /\/__preview__\/security\/privacy/)
  })
})
