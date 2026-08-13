import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  parseGithubRepo,
  resolveGithubRepo,
  resolveGithubToken,
  createGithubIssuesApi,
  GithubIssuesNotConfiguredError,
} from './githubIssues.ts'

describe('parseGithubRepo', () => {
  it('owner/repo を読む', () => {
    assert.deepEqual(parseGithubRepo('nishimura-yuya-git/dentacle'), {
      owner: 'nishimura-yuya-git',
      repo: 'dentacle',
    })
  })

  it('URL から owner/repo を読む', () => {
    assert.deepEqual(
      parseGithubRepo('https://github.com/nishimura-yuya-git/dentacle.git'),
      { owner: 'nishimura-yuya-git', repo: 'dentacle' },
    )
  })

  it('空は null', () => {
    assert.equal(parseGithubRepo(''), null)
    assert.equal(parseGithubRepo(undefined), null)
  })
})

describe('resolveGithubRepo', () => {
  it('FEEDBACK_REPO を優先する', () => {
    const repo = resolveGithubRepo({
      GITHUB_FEEDBACK_REPO: 'acme/app',
      CURSOR_CLOUD_REPO_URL: 'https://github.com/nishimura-yuya-git/dentacle',
    })
    assert.deepEqual(repo, { owner: 'acme', repo: 'app' })
  })

  it('未設定なら既定リポジトリ', () => {
    const repo = resolveGithubRepo({})
    assert.deepEqual(repo, { owner: 'nishimura-yuya-git', repo: 'dentacle' })
  })
})

describe('resolveGithubToken', () => {
  it('FEEDBACK_TOKEN を優先する', () => {
    assert.equal(
      resolveGithubToken({
        GITHUB_FEEDBACK_TOKEN: 'feedback-token',
        GITHUB_TOKEN: 'generic-token',
      }),
      'feedback-token',
    )
  })

  it('未設定は null', () => {
    assert.equal(resolveGithubToken({}), null)
  })
})

describe('createGithubIssuesApi', () => {
  it('401 は未設定エラーにし、本文を漏らさない', async () => {
    const api = createGithubIssuesApi({
      token: 'secret-token',
      repo: { owner: 'o', repo: 'r' },
      fetchImpl: async () => ({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Bad credentials' }),
      }),
    })
    await assert.rejects(
      () => api.createIssue({ title: 't', body: 'b' }),
      GithubIssuesNotConfiguredError,
    )
  })

  it('作成成功時は number と htmlUrl を返す', async () => {
    const api = createGithubIssuesApi({
      token: 'token',
      repo: { owner: 'o', repo: 'r' },
      fetchImpl: async (_url, init) => {
        const payload = JSON.parse(init.body) as { title: string }
        assert.equal(payload.title, 'カレンダー')
        return {
          ok: true,
          status: 201,
          json: async () => ({
            number: 42,
            html_url: 'https://github.com/o/r/issues/42',
          }),
        }
      },
    })
    const created = await api.createIssue({ title: 'カレンダー', body: '詳細' })
    assert.equal(created.number, 42)
    assert.equal(created.htmlUrl, 'https://github.com/o/r/issues/42')
  })
})
