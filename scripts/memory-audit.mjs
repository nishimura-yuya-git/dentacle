#!/usr/bin/env node
/**
 * PROJECT_MEMORY 要詰め監査 CLI（Phase F / Memory Tighten）
 *
 *   pnpm run memory:audit
 *   pnpm run memory:audit -- --json
 *   pnpm run memory:audit -- --fail-on=critical
 *
 * PROJECT_MEMORY.md は自動編集しない。
 */
import {
  DEFAULT_MEMORY_PATH,
  auditProjectMemoryFile,
  formatAuditForContext,
} from './lib/memory-audit.mjs';

const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const failOnArg = args.find((a) => a.startsWith('--fail-on='));
const failOn = failOnArg ? failOnArg.split('=')[1] : 'critical';
const pathIdx = args.indexOf('--path');
const memoryPath = pathIdx >= 0 ? args[pathIdx + 1] : DEFAULT_MEMORY_PATH;

const report = auditProjectMemoryFile(memoryPath);

if (jsonMode) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log('[memory:audit] PROJECT_MEMORY 要詰め監査');
  console.log(`source: ${report.sourcePath}`);
  console.log(
    `summary: critical=${report.summary.critical} high=${report.summary.high} medium=${report.summary.medium} total=${report.summary.total}`,
  );
  console.log('autoEdit: never（提示のみ。反映は /project-memory-learn）');
  console.log('');

  if (report.summary.total === 0) {
    console.log('- 要詰め箇所は検出されませんでした。');
  } else {
    for (const finding of report.findings) {
      console.log(`- [${finding.severity}] ${finding.section}`);
      console.log(`  ${finding.title}`);
      if (finding.detail) console.log(`  詳細: ${finding.detail}`);
      console.log(`  次: ${finding.nextAction}`);
    }
    console.log('');
    console.log(formatAuditForContext(report));
  }
}

const shouldFail =
  failOn === 'any'
    ? report.summary.total > 0
    : failOn === 'high'
      ? report.summary.critical + report.summary.high > 0
      : failOn === 'none'
        ? false
        : report.summary.critical > 0;

process.exit(shouldFail ? 1 : 0);
