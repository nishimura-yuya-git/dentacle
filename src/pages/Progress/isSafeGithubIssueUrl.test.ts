import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isSafeGithubIssueUrl } from './isSafeGithubIssueUrl.ts'

describe('isSafeGithubIssueUrl', () => {
  it('GitHub Issue の https URL だけ許可する', () => {
    assert.equal(
      isSafeGithubIssueUrl('https://github.com/nishimura-yuya-git/dentacle/issues/7'),
      true,
    )
    assert.equal(
      isSafeGithubIssueUrl('https://www.github.com/nishimura-yuya-git/dentacle/issues/7'),
      true,
    )
  })

  it('javascript: や別ホストは拒否する', () => {
    assert.equal(isSafeGithubIssueUrl('javascript:alert(1)'), false)
    assert.equal(isSafeGithubIssueUrl('https://evil.example/issues/7'), false)
    assert.equal(isSafeGithubIssueUrl('https://github.com/evil/repo/issues/7/extra'), false)
    assert.equal(isSafeGithubIssueUrl('https://user:pass@github.com/a/b/issues/1'), false)
    assert.equal(isSafeGithubIssueUrl(''), false)
    assert.equal(isSafeGithubIssueUrl(null), false)
  })
})
