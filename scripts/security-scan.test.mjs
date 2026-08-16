import assert from 'node:assert/strict';
import {
  buildReport,
  findingsAtOrAbove,
  isAtOrAboveSeverity,
} from './lib/security-findings.mjs';
import { resolveKnowledgeBasePaths } from './lib/security-knowledge.mjs';
import { shouldScanFile } from './lib/security-rules.mjs';
import { scanFileContent } from './lib/security-scan-core.mjs';

function testKnowledgeFilter() {
  const resolved = resolveKnowledgeBasePaths((candidate) => candidate === 'PROJECT_MEMORY.md');
  assert.deepEqual(resolved, ['PROJECT_MEMORY.md']);
}

function testShouldScan() {
  assert.equal(shouldScanFile('src/app.tsx'), true);
  assert.equal(shouldScanFile('package-lock.json'), true);
  assert.equal(shouldScanFile('README.md'), false);
  assert.equal(shouldScanFile('.cursor/rules/safety.mdc'), false);
  assert.equal(shouldScanFile('node_modules/foo/index.js'), false);
  assert.equal(shouldScanFile('scripts/lib/security-rules.mjs'), false);
  assert.equal(shouldScanFile('scripts/security-scan.test.mjs'), false);
  assert.equal(shouldScanFile('src/foo.test.ts'), false);
}

function testDetectsSecretsAndEval() {
  // テストファイル自身に実キー風リテラルを残さない（差分スキャンの誤検知防止）
  const sampleKey = ['sk-', 'abcdefghijklmnopqrstuvwxyz123456'].join('');
  const findings = scanFileContent(
    'src/leak.ts',
    [
      `const key = '${sampleKey}';`,
      'eval(userInput);',
      'const role = process.env.VITE_SUPABASE_SERVICE_ROLE;',
    ].join('\n'),
  );
  const ids = findings.map((item) => item.ruleId).sort();
  assert.ok(ids.includes('SEC-SECRET-OPENAI-KEY'));
  assert.ok(ids.includes('SEC-DANGER-EVAL'));
  assert.ok(ids.includes('SEC-VITE-SECRET-PREFIX'));
  assert.ok(ids.includes('SEC-CLIENT-SERVICE-ROLE'));
}

function testLoginAuthRules() {
  const htmlFindings = scanFileContent(
    'src/pages/Login/LoginPage.tsx',
    'root.innerHTML = userInput;',
  );
  assert.ok(htmlFindings.some((item) => item.ruleId === 'SEC-LOGIN-DANGER-HTML'));

  const sqlFindings = scanFileContent(
    'src/features/auth/AuthProvider.tsx',
    'const q = `SELECT * FROM users WHERE email = ${email}`;',
  );
  assert.ok(sqlFindings.some((item) => item.ruleId === 'SEC-LOGIN-SQL-CONCAT'));

  const otherHtml = scanFileContent(
    'src/pages/AuthAudit/AuthAuditJapanMap.tsx',
    'hostRef.current.innerHTML = markup',
  );
  assert.equal(
    otherHtml.filter((item) => item.ruleId === 'SEC-LOGIN-DANGER-HTML').length,
    0,
  );
}

function testLockfileRule() {
  const findings = scanFileContent('package-lock.json', '{}');
  assert.equal(findings.length, 1);
  assert.equal(findings[0].ruleId, 'SEC-LOCKFILE-NPM');
}

function testSeverityGate() {
  assert.equal(isAtOrAboveSeverity('high', 'critical'), true);
  assert.equal(isAtOrAboveSeverity('high', 'medium'), false);
  const report = buildReport({
    findings: [
      {
        id: '1',
        ruleId: 'SEC-DANGER-HTML',
        severity: 'medium',
        title: 'html',
        path: 'a.tsx',
        line: 1,
        evidence: '',
        remediation: '',
      },
      {
        id: '2',
        ruleId: 'SEC-DANGER-EVAL',
        severity: 'high',
        title: 'eval',
        path: 'b.ts',
        line: 2,
        evidence: '',
        remediation: '',
      },
    ],
    mode: 'working-tree',
    filesScanned: ['a.tsx', 'b.ts'],
    knowledgeBase: ['PROJECT_MEMORY.md'],
  });
  assert.equal(report.summary.total, 2);
  assert.equal(findingsAtOrAbove(report, 'high').length, 1);
  assert.equal(report.coverage.completeness, 'complete');
  assert.equal(report.producer, 'security-harness');
}

function main() {
  testKnowledgeFilter();
  testShouldScan();
  testDetectsSecretsAndEval();
  testLoginAuthRules();
  testLockfileRule();
  testSeverityGate();
  console.log('security-scan.test.mjs: OK');
}

main();
