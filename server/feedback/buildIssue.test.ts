import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildFeedbackCommentBody,
  buildFeedbackIssueBody,
  buildFeedbackIssueTitle,
  buildFeedbackReceivedMessage,
  FEEDBACK_BODY_MAX,
  FEEDBACK_PII_NOTICE,
  sanitizePagePath,
} from './buildIssue.ts'

describe('sanitizePagePath', () => {
  it('空はルート', () => {
    assert.equal(sanitizePagePath(''), '/')
    assert.equal(sanitizePagePath(undefined), '/')
  })

  it('クエリとハッシュを落とす', () => {
    assert.equal(sanitizePagePath('/patients/abc?name=太郎#tab'), '/patients/abc')
  })

  it('絶対URLでもパスだけ残す', () => {
    assert.equal(
      sanitizePagePath('https://example.com/calendar?date=2026-08-13'),
      '/calendar',
    )
  })
})

describe('buildFeedbackIssueTitle', () => {
  it('空はご意見', () => {
    assert.equal(buildFeedbackIssueTitle('   '), 'ご意見')
  })

  it('1行目をタイトルにする', () => {
    assert.equal(buildFeedbackIssueTitle('カレンダーが崩れる\n詳細'), 'カレンダーが崩れる')
  })

  it('長い1行は省略する', () => {
    const long = 'あ'.repeat(80)
    const title = buildFeedbackIssueTitle(long)
    assert.equal(title.endsWith('…'), true)
    assert.ok(title.length <= 70)
  })
})

describe('buildFeedbackIssueBody', () => {
  it('本文と画面パスを含み、個人情報注意を付ける', () => {
    const body = buildFeedbackIssueBody({
      body: '自動提案ボタンが押せない',
      pagePath: '/calendar',
      clinicId: 'clinic-1',
      clinicName: 'テスト院',
      userId: 'user-1',
      userEmail: 'staff@example.com',
    })
    assert.match(body, /自動提案ボタンが押せない/)
    assert.match(body, /\/calendar/)
    assert.match(body, /テスト院/)
    assert.match(body, /staff@example.com/)
    assert.match(body, new RegExp(FEEDBACK_PII_NOTICE))
  })
})

describe('buildFeedbackCommentBody', () => {
  it('追記本文に個人情報注意を付ける', () => {
    const body = buildFeedbackCommentBody('追加の再現手順')
    assert.match(body, /追加の再現手順/)
    assert.match(body, new RegExp(FEEDBACK_PII_NOTICE))
  })
})

describe('buildFeedbackReceivedMessage', () => {
  it('新規と追記で文言を分ける', () => {
    assert.equal(
      buildFeedbackReceivedMessage({ issueNumber: 12, isNewIssue: true }),
      '受け付けました。続きは同じ会話に書いてください。',
    )
    assert.equal(
      buildFeedbackReceivedMessage({ issueNumber: 12, isNewIssue: false }),
      '追記しました。',
    )
    assert.equal(
      /issue/i.test(
        buildFeedbackReceivedMessage({ issueNumber: 12, isNewIssue: true }),
      ),
      false,
    )
  })
})

describe('FEEDBACK_BODY_MAX', () => {
  it('4000文字を上限とする', () => {
    assert.equal(FEEDBACK_BODY_MAX, 4000)
  })
})
