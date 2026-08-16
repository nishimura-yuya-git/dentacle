const ISSUE_PATH = /^\/[^/]+\/[^/]+\/issues\/\d+\/?$/

/** 進捗の「GitHubで開く」。javascript: や外部ホストは href にしない。 */
export function isSafeGithubIssueUrl(url: string | null | undefined): boolean {
  const value = url?.trim() ?? ''
  if (!value) return false
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'https:') return false
    if (parsed.username || parsed.password) return false
    if (parsed.hostname !== 'github.com' && parsed.hostname !== 'www.github.com') {
      return false
    }
    return ISSUE_PATH.test(parsed.pathname)
  } catch {
    return false
  }
}
