import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function readSrc(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), 'utf8')
}

const FEEDBACK_SOURCES = [
  'src/features/feedback/sendFeedback.ts',
  'src/features/feedback/useFeedbackChat.ts',
  'src/features/feedback/loadFeedbackHistory.ts',
  'src/features/feedback/loadFeedbackUnread.ts',
  'src/features/feedback/markFeedbackThreadRead.ts',
  'src/components/features/feedback/FeedbackChatPanel.tsx',
  'src/pages/Feedback/FeedbackPage.tsx',
  'api/feedback/send.ts',
  'server/feedback/submitFeedback.ts',
  'server/feedback/supabaseStore.ts',
] as const

const FORBIDDEN_SOURCE_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /dangerouslySetInnerHTML/, label: 'dangerouslySetInnerHTML' },
  { pattern: /\.innerHTML\s*=/, label: 'innerHTML 代入' },
  { pattern: /\beval\s*\(/, label: 'eval' },
  { pattern: /\bnew\s+Function\s*\(/, label: 'new Function' },
  { pattern: /document\.write\s*\(/, label: 'document.write' },
  { pattern: /service_role/, label: 'service_role' },
  {
    pattern: /(?:SELECT|INSERT|UPDATE|DELETE|DROP|UNION)\s+[\s\S]{0,80}(?:\$\{|\+\s*body)/i,
    label: 'SQL 文字列結合',
  },
]

describe('ご意見ソースの危険 API', () => {
  it('HTML 埋め込み・eval・SQL 結合・service_role を置かない', () => {
    for (const relativePath of FEEDBACK_SOURCES) {
      const source = readSrc(relativePath)
      for (const { pattern, label } of FORBIDDEN_SOURCE_PATTERNS) {
        assert.equal(pattern.test(source), false, `${relativePath}: ${label}`)
      }
    }
  })
})

describe('ご意見の公開エラーと権限', () => {
  it('送信失敗は許可リスト経由で、Auth 生 message を出さない', () => {
    const source = readSrc('src/features/feedback/sendFeedback.ts')
    assert.match(source, /toClientFeedbackError/)
    assert.doesNotMatch(source, /sessionError\?\.message/)
    assert.doesNotMatch(source, /error\.message\s*\|\|/)
  })

  it('履歴・未読・既読は固定日本語で失敗する', () => {
    const history = readSrc('src/features/feedback/loadFeedbackHistory.ts')
    const unread = readSrc('src/features/feedback/loadFeedbackUnread.ts')
    const markRead = readSrc('src/features/feedback/markFeedbackThreadRead.ts')
    assert.match(history, /FEEDBACK_HISTORY_LOAD_FAILED/)
    assert.match(unread, /FEEDBACK_UNREAD_LOAD_FAILED/)
    assert.match(markRead, /FEEDBACK_MARK_READ_FAILED/)
    assert.doesNotMatch(history, /throw new Error\(messageError\.message\)/)
    assert.doesNotMatch(unread, /throw new Error\(error\.message\)/)
    assert.doesNotMatch(markRead, /throw new Error\(error\.message\)/)
  })

  it('運営の送信判定は AAL2、メッセージ insert はスレッド本人', () => {
    const store = readSrc('server/feedback/supabaseStore.ts')
    const sql = readSrc(
      'supabase/migrations/20260816044000_feedback_message_insert_owner.sql',
    )
    assert.match(store, /fetchIsPlatformAdminAal2/)
    assert.doesNotMatch(store, /\.from\('platform_admins'\)/)
    assert.match(sql, /feedback_messages_insert/)
    assert.match(sql, /from public\.feedback_threads t/)
    assert.match(sql, /t\.user_id = auth\.uid\(\)/)
  })

  it('進捗の GitHub リンクは許可 URL だけ href にする', () => {
    const source = readSrc('src/pages/Progress/sections/ProgressList.tsx')
    assert.match(source, /isSafeGithubIssueUrl/)
    assert.doesNotMatch(source, /href=\{item\.githubIssueUrl\}/)
  })
})
