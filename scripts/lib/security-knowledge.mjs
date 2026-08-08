/**
 * セキュリティハーネスの knowledge-base（立法・安全ルール）候補。
 * Codex Security の --knowledge-base 発想を、外部 SaaS なしで再利用する。
 */

export const SECURITY_KNOWLEDGE_CANDIDATES = [
  'PROJECT_MEMORY.md',
  'docs/agent-loop-harness.md',
  'docs/architecture',
  '.cursor/rules/safety.mdc',
  '.cursor/rules/supabase-security-hardening.mdc',
  '.cursor/rules/supabase-security-rls.mdc',
  '.cursor/hard-boundaries.json',
];

/**
 * @param {(path: string) => boolean} existsFn
 * @param {string[]} [candidates]
 * @returns {string[]}
 */
export function resolveKnowledgeBasePaths(
  existsFn,
  candidates = SECURITY_KNOWLEDGE_CANDIDATES,
) {
  return candidates.filter((candidate) => existsFn(candidate));
}
