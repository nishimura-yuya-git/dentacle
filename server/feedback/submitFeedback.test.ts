import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'
import { resetFeedbackRateLimitForTests } from './rateLimit.ts'
import { submitFeedback } from './submitFeedback.ts'
import type { GithubIssuesApi } from './githubIssues.ts'
import type { FeedbackStore, FeedbackThreadRecord } from './types.ts'

type Memory = {
  threads: FeedbackThreadRecord[]
  messages: { id: string; threadId: string; body: string; authorRole: string }[]
}

function createMemoryStore(input: {
  user?: { id: string; email: string | null } | null
  canSend?: boolean
  clinicName?: string | null
  memory: Memory
}): FeedbackStore {
  return {
    async getUser() {
      return input.user ?? null
    },
    async canSend() {
      return input.canSend ?? true
    },
    async getClinicName() {
      return input.clinicName ?? 'テスト院'
    },
    async getThread(threadId, userId) {
      return (
        input.memory.threads.find(
          (row) => row.id === threadId && row.userId === userId,
        ) ?? null
      )
    },
    async insertThread(row) {
      input.memory.threads.push({
        id: row.id,
        userId: row.userId,
        clinicId: row.clinicId,
        githubIssueNumber: row.githubIssueNumber,
        githubIssueUrl: row.githubIssueUrl,
        title: row.title,
        pagePath: row.pagePath,
      })
    },
    async insertMessage(row) {
      input.memory.messages.push({
        id: row.id,
        threadId: row.threadId,
        body: row.body,
        authorRole: row.authorRole,
      })
    },
  }
}

function createGithubMock(calls: { issues: number; comments: number }): GithubIssuesApi {
  return {
    async createIssue() {
      calls.issues += 1
      return {
        number: 7,
        htmlUrl: 'https://github.com/nishimura-yuya-git/dentacle/issues/7',
      }
    },
    async addComment() {
      calls.comments += 1
    },
  }
}

const user = { id: 'user-1', email: 'staff@example.com' }

describe('submitFeedback', () => {
  beforeEach(() => {
    resetFeedbackRateLimitForTests()
  })

  it('未ログインは unauthorized', async () => {
    const memory: Memory = { threads: [], messages: [] }
    const result = await submitFeedback(
      { accessToken: '', body: '不具合です' },
      {
        store: createMemoryStore({ user: null, memory }),
        github: createGithubMock({ issues: 0, comments: 0 }),
      },
    )
    assert.equal(result.ok, false)
    if (!result.ok) assert.equal(result.code, 'unauthorized')
  })

  it('空本文は bad_request', async () => {
    const memory: Memory = { threads: [], messages: [] }
    const result = await submitFeedback(
      { accessToken: 'token', body: '   ' },
      {
        store: createMemoryStore({ user, memory }),
        github: createGithubMock({ issues: 0, comments: 0 }),
      },
    )
    assert.equal(result.ok, false)
    if (!result.ok) {
      assert.equal(result.code, 'bad_request')
      assert.match(result.error, /本文/)
    }
  })

  it('権限がなければ forbidden', async () => {
    const memory: Memory = { threads: [], messages: [] }
    const result = await submitFeedback(
      { accessToken: 'token', body: '不具合です', clinicId: 'clinic-1' },
      {
        store: createMemoryStore({ user, canSend: false, memory }),
        github: createGithubMock({ issues: 0, comments: 0 }),
      },
    )
    assert.equal(result.ok, false)
    if (!result.ok) assert.equal(result.code, 'forbidden')
  })

  it('新規送信で Issue を作り、受付メッセージを返す', async () => {
    const memory: Memory = { threads: [], messages: [] }
    const calls = { issues: 0, comments: 0 }
    let idSeq = 0
    const result = await submitFeedback(
      {
        accessToken: 'token',
        body: 'カレンダーの日付ナビが切れる',
        clinicId: 'clinic-1',
        pagePath: '/calendar?date=2026-08-13',
      },
      {
        store: createMemoryStore({ user, memory }),
        github: createGithubMock(calls),
        now: () => new Date('2026-08-13T12:00:00.000Z'),
        createId: () => `id-${++idSeq}`,
      },
    )
    assert.equal(result.ok, true)
    if (!result.ok) return
    assert.equal(result.issueNumber, 7)
    assert.equal(calls.issues, 1)
    assert.equal(calls.comments, 0)
    assert.equal(memory.threads.length, 1)
    assert.equal(memory.threads[0]?.pagePath, '/calendar')
    assert.equal(result.messages[0]?.role, 'user')
    assert.equal(result.messages[1]?.role, 'system')
    assert.match(result.messages[1]?.body ?? '', /受け付けました/)
    assert.equal(/issue/i.test(result.messages[1]?.body ?? ''), false)
  })

  it('同じスレッドへの続きはコメントにする', async () => {
    const memory: Memory = {
      threads: [
        {
          id: 'thread-1',
          userId: 'user-1',
          clinicId: 'clinic-1',
          githubIssueNumber: 7,
          githubIssueUrl: 'https://github.com/nishimura-yuya-git/dentacle/issues/7',
          title: 'カレンダー',
          pagePath: '/calendar',
        },
      ],
      messages: [],
    }
    const calls = { issues: 0, comments: 0 }
    const result = await submitFeedback(
      {
        accessToken: 'token',
        body: 'スマホでも再現します',
        threadId: 'thread-1',
      },
      {
        store: createMemoryStore({ user, memory }),
        github: createGithubMock(calls),
        createId: (() => {
          let n = 0
          return () => `c-${++n}`
        })(),
      },
    )
    assert.equal(result.ok, true)
    if (!result.ok) return
    assert.equal(calls.issues, 0)
    assert.equal(calls.comments, 1)
    assert.match(result.messages[1]?.body ?? '', /追記しました/)
  })

  it('同じユーザーの連続送信は rate_limited', async () => {
    const memory: Memory = { threads: [], messages: [] }
    const deps = {
      store: createMemoryStore({ user, memory }),
      github: createGithubMock({ issues: 0, comments: 0 }),
      createId: (() => {
        let n = 0
        return () => `r-${++n}`
      })(),
    }
    const first = await submitFeedback(
      { accessToken: 'token', body: '1件目', clinicId: 'clinic-1' },
      deps,
    )
    assert.equal(first.ok, true)
    const second = await submitFeedback(
      { accessToken: 'token', body: '2件目', clinicId: 'clinic-1' },
      deps,
    )
    assert.equal(second.ok, false)
    if (!second.ok) assert.equal(second.code, 'rate_limited')
  })
})
