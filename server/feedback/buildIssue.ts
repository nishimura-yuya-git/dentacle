/** Issue タイトルの上限（GitHub は 256。画面向けに短くする） */
export const FEEDBACK_TITLE_MAX = 70
/** 本文の上限（チャット1通） */
export const FEEDBACK_BODY_MAX = 4000

export const FEEDBACK_PII_NOTICE =
  '患者氏名・カルテ番号などの個人情報は書かないでください。'

const ISSUE_FOOTER = [
  '---',
  'この Issue はデンタクルのご意見チャットから自動作成されました。',
  `※ ${FEEDBACK_PII_NOTICE}`,
].join('\n')

/** クエリやハッシュを落とし、パスだけ残す（患者ID等がURLに乗らないようにする） */
export function sanitizePagePath(raw: string | undefined): string {
  const value = (raw ?? '').trim()
  if (!value) return '/'
  try {
    const url = value.startsWith('/')
      ? new URL(value, 'https://dentacle.local')
      : new URL(value)
    const path = url.pathname.trim() || '/'
    return path.slice(0, 200)
  } catch {
    const pathOnly = value.split('?')[0]?.split('#')[0]?.trim() || '/'
    return pathOnly.startsWith('/') ? pathOnly.slice(0, 200) : '/'
  }
}

export function buildFeedbackIssueTitle(body: string): string {
  const first = body.trim().split(/\n/)[0] ?? ''
  const compact = first.replace(/\s+/g, ' ').trim()
  if (!compact) return 'ご意見'
  if (compact.length <= FEEDBACK_TITLE_MAX) return compact
  return `${compact.slice(0, FEEDBACK_TITLE_MAX - 1)}…`
}

export function buildFeedbackIssueBody(input: {
  body: string
  pagePath: string
  clinicId: string | null
  clinicName: string | null
  userId: string
  userEmail: string | null
}): string {
  const lines = [
    '## ご意見・不具合',
    '',
    input.body.trim(),
    '',
    '## 送信時の情報',
    '',
    `- 画面: \`${input.pagePath}\``,
    `- クリニック: ${input.clinicName?.trim() || '（未設定）'}`,
    `- クリニックID: \`${input.clinicId ?? '（なし）'}\``,
    `- 送信者: ${input.userEmail?.trim() || '（メールなし）'}`,
    `- 送信者ID: \`${input.userId}\``,
    '',
    ISSUE_FOOTER,
  ]
  return lines.join('\n')
}

export function buildFeedbackCommentBody(body: string): string {
  return [body.trim(), '', ISSUE_FOOTER].join('\n')
}

export function buildFeedbackReceivedMessage(input: {
  issueNumber: number
  isNewIssue: boolean
}): string {
  if (input.isNewIssue) {
    return `受け付けました（#${input.issueNumber}）。続きのメッセージは同じ Issue に追記します。`
  }
  return `追記しました（#${input.issueNumber}）。`
}
