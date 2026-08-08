/**
 * セキュリティ findings / coverage 契約（Codex Security 成果物の薄い互換イメージ）。
 */

/** @typedef {'critical' | 'high' | 'medium' | 'low'} Severity */

const SEVERITY_RANK = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * @param {Severity | string} level
 * @returns {number}
 */
export function severityRank(level) {
  return SEVERITY_RANK[level] ?? 0;
}

/**
 * @param {Severity} threshold
 * @param {Severity} severity
 */
export function isAtOrAboveSeverity(threshold, severity) {
  return severityRank(severity) >= severityRank(threshold);
}

/**
 * @param {object} input
 * @param {string} input.ruleId
 * @param {Severity} input.severity
 * @param {string} input.title
 * @param {string} input.path
 * @param {number} [input.line]
 * @param {string} [input.evidence]
 * @param {string} [input.remediation]
 */
export function createFinding(input) {
  return {
    id: `${input.ruleId}:${input.path}:${input.line ?? 0}`,
    ruleId: input.ruleId,
    severity: input.severity,
    title: input.title,
    path: input.path,
    line: input.line ?? null,
    evidence: input.evidence ?? '',
    remediation: input.remediation ?? '',
  };
}

/**
 * @param {object} params
 * @param {Array<object>} params.findings
 * @param {string} params.mode
 * @param {string[]} params.filesScanned
 * @param {string[]} params.knowledgeBase
 * @param {string} [params.baseRef]
 */
export function buildReport({ findings, mode, filesScanned, knowledgeBase, baseRef }) {
  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const finding of findings) {
    if (bySeverity[finding.severity] !== undefined) {
      bySeverity[finding.severity] += 1;
    }
  }

  return {
    producer: 'security-harness',
    generatedAt: new Date().toISOString(),
    mode,
    baseRef: baseRef ?? null,
    findings,
    summary: {
      total: findings.length,
      ...bySeverity,
    },
    coverage: {
      completeness: 'complete',
      filesScanned,
      knowledgeBase,
      notes: [
        '外部 SaaS / OpenAI API には依存しないローカル差分検査です。',
        'カバレッジは「差分に対するルール適用」であり、動的解析やペネトレーションテストの代替ではありません。',
      ],
    },
  };
}

/**
 * @param {object} report
 * @param {Severity} threshold
 */
export function findingsAtOrAbove(report, threshold) {
  return (report.findings ?? []).filter((finding) =>
    isAtOrAboveSeverity(threshold, finding.severity),
  );
}
