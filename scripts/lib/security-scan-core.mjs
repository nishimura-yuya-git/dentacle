import { createFinding } from './security-findings.mjs';
import { SECURITY_RULES } from './security-rules.mjs';

/**
 * @param {string} filePath
 * @param {string} content
 */
export function scanFileContent(filePath, content) {
  const findings = [];
  const fileRules = SECURITY_RULES.filter((rule) => (rule.scope ?? 'line') === 'file');
  const lineRules = SECURITY_RULES.filter((rule) => (rule.scope ?? 'line') === 'line');

  for (const rule of fileRules) {
    if (rule.applies && !rule.applies({ filePath })) continue;
    findings.push(
      createFinding({
        ruleId: rule.id,
        severity: rule.severity,
        title: rule.title,
        path: filePath,
        line: 1,
        evidence: filePath,
        remediation: rule.remediation,
      }),
    );
  }

  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    for (const rule of lineRules) {
      if (rule.applies && !rule.applies({ filePath, line })) continue;
      if (!rule.pattern || !rule.pattern.test(line)) continue;
      findings.push(
        createFinding({
          ruleId: rule.id,
          severity: rule.severity,
          title: rule.title,
          path: filePath,
          line: index + 1,
          evidence: line.trim().slice(0, 200),
          remediation: rule.remediation,
        }),
      );
    }
  }

  return findings;
}
