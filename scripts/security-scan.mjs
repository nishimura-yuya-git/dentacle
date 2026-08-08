#!/usr/bin/env node
/**
 * GPT / OpenAI 非依存のセキュリティ差分スキャナ。
 *
 * Codex Security から借りた型:
 * - PR / working-tree 差分スコープ
 * - knowledge-base（立法ファイルの明示）
 * - findings + coverage 成果物
 * - severity 閾値での exit
 *
 * 例:
 *   pnpm run security:scan
 *   pnpm run security:scan -- --diff origin/main
 *   pnpm run security:scan -- --fail-on-severity high --json
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { resolveKnowledgeBasePaths } from './lib/security-knowledge.mjs';
import { buildReport, findingsAtOrAbove } from './lib/security-findings.mjs';
import { shouldScanFile } from './lib/security-rules.mjs';
import { scanFileContent } from './lib/security-scan-core.mjs';

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

function tryGit(args) {
  try {
    return git(args);
  } catch {
    return '';
  }
}

function parseArgs(argv) {
  let baseRef = process.env.SECURITY_SCAN_BASE || 'HEAD';
  let mode = 'working-tree';
  let failOn = process.env.SECURITY_FAIL_ON_SEVERITY || 'high';
  let jsonMode = false;
  let outputPath =
    process.env.SECURITY_SCAN_OUTPUT || path.join('state', 'security-findings.json');
  let showHelp = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--') continue;
    if (arg === '--help' || arg === '-h') {
      showHelp = true;
      continue;
    }
    if (arg === '--json') {
      jsonMode = true;
      continue;
    }
    if (arg === '--working-tree') {
      mode = 'working-tree';
      continue;
    }
    if (arg === '--diff') {
      mode = 'diff';
      baseRef = argv[i + 1] || baseRef;
      i += 1;
      continue;
    }
    if (arg === '--base') {
      baseRef = argv[i + 1] || baseRef;
      i += 1;
      continue;
    }
    if (arg === '--fail-on-severity') {
      failOn = argv[i + 1] || failOn;
      i += 1;
      continue;
    }
    if (arg === '--output') {
      outputPath = argv[i + 1] || outputPath;
      i += 1;
      continue;
    }
  }

  return { baseRef, mode, failOn, jsonMode, outputPath, showHelp };
}

function listTargetFiles(mode, baseRef) {
  if (mode === 'diff') {
    return tryGit(['diff', '--name-only', '--diff-filter=ACMR', `${baseRef}...HEAD`, '--'])
      .split('\n')
      .filter(Boolean)
      .sort();
  }

  const diffFiles = tryGit(['diff', '--name-only', '--diff-filter=ACMR', baseRef, '--'])
    .split('\n')
    .filter(Boolean);
  const untracked = tryGit(['ls-files', '--others', '--exclude-standard'])
    .split('\n')
    .filter(Boolean);
  return [...new Set([...diffFiles, ...untracked])].sort();
}

function scanFile(filePath) {
  if (!shouldScanFile(filePath)) return [];

  const normalized = filePath.replace(/\\/g, '/');
  if (normalized.endsWith('package-lock.json') || normalized.endsWith('yarn.lock')) {
    return scanFileContent(filePath, '');
  }

  if (!existsSync(filePath)) return [];
  let content = '';
  try {
    content = readFileSync(filePath, 'utf8');
  } catch {
    return [];
  }

  const maxChars = 400_000;
  if (content.length > maxChars) {
    content = content.slice(0, maxChars);
  }
  return scanFileContent(filePath, content);
}

function printHelp() {
  console.log(`使い方:
  pnpm run security:scan -- [--working-tree|--diff <base>] [--fail-on-severity high] [--json]

既定:
  - working-tree（未コミット差分 + 未追跡）
  - fail-on-severity=high
  - 成果物: state/security-findings.json

OpenAI API / Codex Security 製品には依存しません。`);
}

function main() {
  const { baseRef, mode, failOn, jsonMode, outputPath, showHelp } = parseArgs(
    process.argv.slice(2),
  );
  if (showHelp) {
    printHelp();
    process.exit(0);
  }

  if (!tryGit(['rev-parse', '--is-inside-work-tree'])) {
    // 雛形コピー直後など .git が無い場合は fail せず skip（diff base 無しと同じ扱い）
    console.error('[security:scan] Git 未初期化のためスキップします（exit 0）。');
    process.exit(0);
  }

  const knowledgeBase = resolveKnowledgeBasePaths((candidate) => existsSync(candidate));
  const files = listTargetFiles(mode, baseRef);
  const scannable = files.filter((filePath) => shouldScanFile(filePath));
  const findings = scannable.flatMap((filePath) => scanFile(filePath));

  const report = buildReport({
    findings,
    mode,
    filesScanned: scannable,
    knowledgeBase,
    baseRef,
  });

  const outputDir = path.dirname(outputPath);
  if (outputDir && outputDir !== '.') {
    mkdirSync(outputDir, { recursive: true });
  }
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  if (jsonMode) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    console.log('[security:scan] mode:', mode);
    console.log('[security:scan] base:', baseRef);
    console.log('[security:scan] files:', scannable.length, '/', files.length);
    console.log('[security:scan] knowledge-base:');
    for (const item of knowledgeBase) console.log(`  - ${item}`);
    if (knowledgeBase.length === 0) console.log('  (なし)');
    console.log('[security:scan] findings:', report.summary.total, report.summary);
    for (const finding of findings) {
      console.log(
        `- [${finding.severity}] ${finding.ruleId} ${finding.path}:${finding.line ?? '-'} ${finding.title}`,
      );
    }
    console.log('[security:scan] report:', outputPath);
  }

  const blocking = findingsAtOrAbove(report, failOn);
  if (blocking.length > 0) {
    console.error(
      `[security:scan] ${failOn} 以上の finding が ${blocking.length} 件あります。`,
    );
    process.exit(1);
  }

  console.error('[security:scan] 閾値以上の finding はありません。');
  process.exit(0);
}

main();
