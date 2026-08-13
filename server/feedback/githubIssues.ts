export type GithubIssueCreated = {
  number: number
  htmlUrl: string
}

export type GithubIssuesApi = {
  createIssue: (input: { title: string; body: string }) => Promise<GithubIssueCreated>
  addComment: (input: { issueNumber: number; body: string }) => Promise<void>
}

export type GithubRepoRef = {
  owner: string
  repo: string
}

type FetchLike = (
  input: string,
  init: {
    method: string
    headers: Record<string, string>
    body: string
  },
) => Promise<{
  ok: boolean
  status: number
  json: () => Promise<unknown>
}>

export class GithubIssuesNotConfiguredError extends Error {
  constructor(message = 'GitHub Issue 連携が未設定です') {
    super(message)
    this.name = 'GithubIssuesNotConfiguredError'
  }
}

export class GithubIssuesRequestError extends Error {
  constructor(message = 'GitHub Issue の操作に失敗しました') {
    super(message)
    this.name = 'GithubIssuesRequestError'
  }
}

/** owner/repo または GitHub URL からリポジトリを読む */
export function parseGithubRepo(raw: string | undefined): GithubRepoRef | null {
  const value = (raw ?? '').trim()
  if (!value) return null

  const fromUrl = /github\.com[:/]([^/]+)\/([^/#?]+)/i.exec(value)
  if (fromUrl?.[1] && fromUrl[2]) {
    return {
      owner: fromUrl[1],
      repo: fromUrl[2].replace(/\.git$/, ''),
    }
  }

  const parts = value.split('/').filter(Boolean)
  if (parts.length === 2 && parts[0] && parts[1]) {
    return {
      owner: parts[0],
      repo: parts[1].replace(/\.git$/, ''),
    }
  }
  return null
}

export function resolveGithubRepo(env: NodeJS.ProcessEnv = process.env): GithubRepoRef | null {
  return (
    parseGithubRepo(env.GITHUB_FEEDBACK_REPO) ??
    parseGithubRepo(env.CURSOR_CLOUD_REPO_URL) ??
    parseGithubRepo('nishimura-yuya-git/dentacle')
  )
}

export function resolveGithubToken(env: NodeJS.ProcessEnv = process.env): string | null {
  const token =
    env.GITHUB_FEEDBACK_TOKEN?.trim() || env.GITHUB_TOKEN?.trim() || ''
  return token || null
}

function githubHeaders(token: string): Record<string, string> {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'dentacle-feedback',
  }
}

function asIssueCreated(raw: unknown): GithubIssueCreated | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const record = raw as { number?: unknown; html_url?: unknown }
  if (typeof record.number !== 'number' || typeof record.html_url !== 'string') {
    return null
  }
  return { number: record.number, htmlUrl: record.html_url }
}

export function createGithubIssuesApi(input: {
  token: string
  repo: GithubRepoRef
  fetchImpl?: FetchLike
}): GithubIssuesApi {
  const fetchImpl = input.fetchImpl ?? (globalThis.fetch as FetchLike)
  const base = `https://api.github.com/repos/${input.repo.owner}/${input.repo.repo}`

  return {
    async createIssue({ title, body }) {
      const response = await fetchImpl(`${base}/issues`, {
        method: 'POST',
        headers: githubHeaders(input.token),
        body: JSON.stringify({ title, body }),
      })
      if (response.status === 401 || response.status === 403 || response.status === 404) {
        console.error('[feedback:github] createIssue unauthorized-or-missing', response.status)
        throw new GithubIssuesNotConfiguredError()
      }
      if (!response.ok) {
        console.error('[feedback:github] createIssue failed', response.status)
        throw new GithubIssuesRequestError()
      }
      const created = asIssueCreated(await response.json())
      if (!created) {
        console.error('[feedback:github] createIssue payload invalid')
        throw new GithubIssuesRequestError()
      }
      return created
    },

    async addComment({ issueNumber, body }) {
      const response = await fetchImpl(`${base}/issues/${issueNumber}/comments`, {
        method: 'POST',
        headers: githubHeaders(input.token),
        body: JSON.stringify({ body }),
      })
      if (response.status === 401 || response.status === 403 || response.status === 404) {
        console.error('[feedback:github] addComment unauthorized-or-missing', response.status)
        throw new GithubIssuesNotConfiguredError()
      }
      if (!response.ok) {
        console.error('[feedback:github] addComment failed', response.status)
        throw new GithubIssuesRequestError()
      }
    },
  }
}

export function createGithubIssuesApiFromEnv(
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl?: FetchLike,
): GithubIssuesApi {
  const token = resolveGithubToken(env)
  const repo = resolveGithubRepo(env)
  if (!token || !repo) {
    throw new GithubIssuesNotConfiguredError()
  }
  return createGithubIssuesApi({ token, repo, fetchImpl })
}
