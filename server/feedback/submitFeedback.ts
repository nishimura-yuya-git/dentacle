import { randomUUID } from 'node:crypto'
import {
  buildFeedbackCommentBody,
  buildFeedbackIssueBody,
  buildFeedbackIssueTitle,
  buildFeedbackReceivedMessage,
  FEEDBACK_BODY_MAX,
  sanitizePagePath,
} from './buildIssue.ts'
import {
  GithubIssuesNotConfiguredError,
  GithubIssuesRequestError,
  type GithubIssuesApi,
} from './githubIssues.ts'
import {
  releaseFeedbackSlot,
  tryAcquireFeedbackSlot,
} from './rateLimit.ts'
import {
  toPublicFeedbackError,
  toRateLimitedFeedbackError,
} from './publicErrors.ts'
import type {
  FeedbackStore,
  SubmitFeedbackInput,
  SubmitFeedbackResult,
} from './types.ts'

export type SubmitFeedbackDeps = {
  store: FeedbackStore
  github: GithubIssuesApi
  now?: () => Date
  createId?: () => string
}

function logFeedbackError(scope: string, err: unknown): void {
  console.error(
    `[submitFeedback:${scope}]`,
    err instanceof Error ? err.message : err,
  )
}

function asTrimmed(value: string | undefined): string {
  return (value ?? '').trim()
}

/**
 * ご意見チャット1通を GitHub Issue（新規）または既存 Issue のコメントにする。
 * DB への保存は履歴用。正とする外部記録は GitHub Issue。
 */
export async function submitFeedback(
  input: SubmitFeedbackInput,
  deps: SubmitFeedbackDeps,
): Promise<SubmitFeedbackResult> {
  if (!asTrimmed(input.accessToken)) {
    return {
      ok: false,
      code: 'unauthorized',
      error: toPublicFeedbackError('unauthorized'),
    }
  }

  const body = asTrimmed(input.body)
  if (!body) {
    return {
      ok: false,
      code: 'bad_request',
      error: toPublicFeedbackError('bad_request', '本文を入力してください'),
    }
  }
  if (body.length > FEEDBACK_BODY_MAX) {
    return {
      ok: false,
      code: 'bad_request',
      error: toPublicFeedbackError(
        'bad_request',
        `本文は${FEEDBACK_BODY_MAX}文字以内にしてください`,
      ),
    }
  }

  const user = await deps.store.getUser(input.accessToken)
  if (!user) {
    return {
      ok: false,
      code: 'unauthorized',
      error: toPublicFeedbackError('unauthorized'),
    }
  }

  const clinicId = asTrimmed(input.clinicId) || null
  const allowed = await deps.store.canSend(user.id, clinicId)
  if (!allowed) {
    return {
      ok: false,
      code: 'forbidden',
      error: toPublicFeedbackError('forbidden'),
    }
  }

  const rate = tryAcquireFeedbackSlot(user.id)
  if (!rate.ok) {
    return {
      ok: false,
      code: 'rate_limited',
      error: toRateLimitedFeedbackError(rate.retryAfterSec),
      retryAfterSec: rate.retryAfterSec,
    }
  }

  try {
    return await submitFeedbackInner(input, deps, user.id, user.email, clinicId, body)
  } finally {
    releaseFeedbackSlot(user.id)
  }
}

async function submitFeedbackInner(
  input: SubmitFeedbackInput,
  deps: SubmitFeedbackDeps,
  userId: string,
  userEmail: string | null,
  clinicId: string | null,
  body: string,
): Promise<SubmitFeedbackResult> {
  const now = deps.now?.() ?? new Date()
  const createId = deps.createId ?? randomUUID
  const pagePath = sanitizePagePath(input.pagePath)
  const threadIdInput = asTrimmed(input.threadId)

  try {
    if (threadIdInput) {
      return await appendToThread({
        deps,
        threadId: threadIdInput,
        userId,
        body,
        now,
        createId,
      })
    }

    const clinicName = clinicId ? await deps.store.getClinicName(clinicId) : null
    const title = buildFeedbackIssueTitle(body)
    const issueBody = buildFeedbackIssueBody({
      body,
      pagePath,
      clinicId,
      clinicName,
      userId,
      userEmail,
    })
    const created = await deps.github.createIssue({ title, body: issueBody })
    const threadId = createId()
    const userMessageId = createId()
    const systemMessageId = createId()
    const createdAt = now.toISOString()
    const systemBody = buildFeedbackReceivedMessage({
      issueNumber: created.number,
      isNewIssue: true,
    })

    let threadSaved = false
    try {
      await deps.store.insertThread({
        id: threadId,
        userId,
        clinicId,
        githubIssueNumber: created.number,
        githubIssueUrl: created.htmlUrl,
        title,
        pagePath,
      })
      threadSaved = true
      await deps.store.insertMessage({
        id: userMessageId,
        threadId,
        userId,
        authorRole: 'user',
        body,
        createdAt,
      })
      await deps.store.insertMessage({
        id: systemMessageId,
        threadId,
        userId,
        authorRole: 'system',
        body: systemBody,
        createdAt,
      })
    } catch (err) {
      logFeedbackError('save', err)
    }

    if (threadSaved) {
      try {
        await deps.store.createImprovementItem(threadId)
      } catch (err) {
        logFeedbackError('improvement', err)
      }
    }

    return {
      ok: true,
      threadId,
      issueNumber: created.number,
      issueUrl: created.htmlUrl,
      messages: [
        { id: userMessageId, role: 'user', body, createdAt },
        { id: systemMessageId, role: 'system', body: systemBody, createdAt },
      ],
    }
  } catch (err) {
    if (err instanceof GithubIssuesNotConfiguredError) {
      return {
        ok: false,
        code: 'not_configured',
        error: toPublicFeedbackError('not_configured'),
      }
    }
    if (err instanceof GithubIssuesRequestError) {
      logFeedbackError('github', err)
      return {
        ok: false,
        code: 'internal',
        error: toPublicFeedbackError('internal'),
      }
    }
    logFeedbackError('inner', err)
    return {
      ok: false,
      code: 'internal',
      error: toPublicFeedbackError('internal'),
    }
  }
}

async function appendToThread(input: {
  deps: SubmitFeedbackDeps
  threadId: string
  userId: string
  body: string
  now: Date
  createId: () => string
}): Promise<SubmitFeedbackResult> {
  const thread = await input.deps.store.getThread(input.threadId, input.userId)
  if (!thread || thread.userId !== input.userId) {
    return {
      ok: false,
      code: 'bad_request',
      error: toPublicFeedbackError('bad_request', '対象のご意見が見つかりません'),
    }
  }
  if (!thread.githubIssueNumber || !thread.githubIssueUrl) {
    return {
      ok: false,
      code: 'internal',
      error: toPublicFeedbackError('internal'),
    }
  }

  await input.deps.github.addComment({
    issueNumber: thread.githubIssueNumber,
    body: buildFeedbackCommentBody(input.body),
  })

  const createdAt = input.now.toISOString()
  const userMessageId = input.createId()
  const systemMessageId = input.createId()
  const systemBody = buildFeedbackReceivedMessage({
    issueNumber: thread.githubIssueNumber,
    isNewIssue: false,
  })

  try {
    await input.deps.store.insertMessage({
      id: userMessageId,
      threadId: thread.id,
      userId: input.userId,
      authorRole: 'user',
      body: input.body,
      createdAt,
    })
    await input.deps.store.insertMessage({
      id: systemMessageId,
      threadId: thread.id,
      userId: input.userId,
      authorRole: 'system',
      body: systemBody,
      createdAt,
    })
  } catch (err) {
    logFeedbackError('save-comment', err)
  }

  return {
    ok: true,
    threadId: thread.id,
    issueNumber: thread.githubIssueNumber,
    issueUrl: thread.githubIssueUrl,
    messages: [
      { id: userMessageId, role: 'user', body: input.body, createdAt },
      { id: systemMessageId, role: 'system', body: systemBody, createdAt },
    ],
  }
}
