export type FeedbackAuthorRole = 'user' | 'system'

export type FeedbackUser = {
  id: string
  email: string | null
}

export type FeedbackThreadRecord = {
  id: string
  userId: string
  clinicId: string | null
  githubIssueNumber: number | null
  githubIssueUrl: string | null
  title: string
  pagePath: string
}

export type FeedbackMessageRecord = {
  id: string
  threadId: string
  userId: string
  authorRole: FeedbackAuthorRole
  body: string
  createdAt: string
}

export type FeedbackStore = {
  getUser: (accessToken: string) => Promise<FeedbackUser | null>
  canSend: (userId: string, clinicId: string | null) => Promise<boolean>
  getClinicName: (clinicId: string) => Promise<string | null>
  getThread: (threadId: string, userId: string) => Promise<FeedbackThreadRecord | null>
  insertThread: (input: {
    id: string
    userId: string
    clinicId: string | null
    githubIssueNumber: number
    githubIssueUrl: string
    title: string
    pagePath: string
  }) => Promise<void>
  insertMessage: (input: {
    id: string
    threadId: string
    userId: string
    authorRole: FeedbackAuthorRole
    body: string
    createdAt: string
  }) => Promise<void>
}

export type FeedbackMessageDto = {
  id: string
  role: FeedbackAuthorRole
  body: string
  createdAt: string
}

export type SubmitFeedbackInput = {
  accessToken: string
  body: string
  clinicId?: string
  pagePath?: string
  threadId?: string
}

export type SubmitFeedbackSuccess = {
  ok: true
  threadId: string
  issueNumber: number
  issueUrl: string
  messages: FeedbackMessageDto[]
}

export type SubmitFeedbackFailure = {
  ok: false
  code:
    | 'unauthorized'
    | 'forbidden'
    | 'bad_request'
    | 'rate_limited'
    | 'not_configured'
    | 'internal'
  error: string
  retryAfterSec?: number
}

export type SubmitFeedbackResult = SubmitFeedbackSuccess | SubmitFeedbackFailure
