#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  DEFAULT_BOUNDARY_CONFIG_PATH,
  DEFAULT_PROTECTED_PATTERNS,
  loadProjectBoundaryConfig,
  normalizeProjectPath,
} from './lib/hard-boundary-policy.mjs';
import { loadChangeContractGate } from './lib/change-contract-gate.mjs';
import { evaluateIsolationNeed } from './lib/isolation-policy.mjs';

const jsonMode = process.argv.includes('--json');
const writeState = process.argv.includes('--write-state');
const baseRef = process.env.LOOP_BASE || 'HEAD';
const statePath = process.env.LOOP_STATE_FILE || 'state/loop-findings.json';
const boundaryConfigPath = process.env.HARD_BOUNDARY_CONFIG || DEFAULT_BOUNDARY_CONFIG_PATH;

const uiPatterns = [/^src\/pages\//, /^src\/components\//];

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

function listChangedFiles() {
  const diffFiles = tryGit(['diff', '--name-only', '--diff-filter=ACMR', baseRef, '--'])
    .split('\n')
    .filter(Boolean);
  const untrackedFiles = tryGit(['ls-files', '--others', '--exclude-standard'])
    .split('\n')
    .filter(Boolean);
  return [...new Set([...diffFiles, ...untrackedFiles])].sort();
}

function runJson(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    shell: false,
  });

  try {
    return JSON.parse(result.stdout);
  } catch {
    return null;
  }
}

function buildFinding({ type, severity, title, description, evidence, nextAction }) {
  const idSource = `${type}:${title}:${evidence.join('|')}`;
  const id = Buffer.from(idSource).toString('base64url').slice(0, 16);
  return {
    id,
    type,
    severity,
    status: 'open',
    title,
    description,
    evidence,
    nextAction,
  };
}

function collectHardBoundaryFindings(files, projectConfig) {
  const findings = projectConfig.errors.map((error) =>
    buildFinding({
      type: 'hard-boundary',
      severity: 'stop',
      title: 'Hard Boundary 設定エラー',
      description: error,
      evidence: [boundaryConfigPath],
      nextAction: '設定形式を修正してから再実行してください。',
    }),
  );
  const protectedPatterns = [...DEFAULT_PROTECTED_PATTERNS, ...projectConfig.patterns];

  for (const file of files) {
    const normalized = normalizeProjectPath(file);
    for (const item of protectedPatterns) {
      if (!item.pattern.test(normalized)) continue;

      findings.push(
        buildFinding({
          type: 'hard-boundary',
          severity: 'stop',
          title: `${item.label} の変更を検知`,
          description: '保護対象への変更は、変更契約・Evidence Map・ユーザー承認が必要です。',
          evidence: [normalized],
          nextAction: '自動続行せず、変更契約と承認理由を明示してください。',
        }),
      );
    }
  }

  return findings;
}

function collectUiFindings(files) {
  const uiFiles = files.filter((file) => uiPatterns.some((pattern) => pattern.test(file)));
  if (uiFiles.length === 0) return [];

  return [
    buildFinding({
      type: 'ui-polish',
      severity: 'warn',
      title: 'UI変更の表示確認が必要',
      description: 'UI変更では、文言・余白・見切れ・見出し重複・FAB衝突・禁止アイコン・装飾英語を実画面で確認する必要があります。',
      evidence: uiFiles,
      nextAction: 'ブラウザで Overlay / Chat 検査と、AIがある画面では実行中の Composing 観察を行い、観察証拠を残してください。',
    }),
  ];
}

function collectLoopHarnessFindings(files) {
  const harnessFiles = files.filter(
    (file) =>
      file.startsWith('scripts/loop-') ||
      file.startsWith('loops/') ||
      file === 'docs/agent-loop-harness.md' ||
      file === 'package.json',
  );

  if (harnessFiles.length === 0) return [];

  return [
    buildFinding({
      type: 'loop-harness',
      severity: 'warn',
      title: 'ループハーネス変更を検知',
      description: 'ハーネス変更では、発見・評価・停止条件が既存の doctor 判定を壊していないか確認します。',
      evidence: harnessFiles,
      nextAction: 'loop-discover、loop-evaluator、loop:run の順に実行して出力を確認してください。',
    }),
  ];
}

function collectIsolationFindings(files) {
  const evaluation = evaluateIsolationNeed({
    files,
    gate: loadChangeContractGate(),
  });

  if (evaluation.level === 'none') return [];

  return [
    buildFinding({
      type: 'isolation',
      severity: evaluation.level === 'required' ? 'stop' : 'warn',
      title:
        evaluation.level === 'required'
          ? '危険差分のため隔離（worktree/shadow）が必要'
          : '隔離（worktree/shadow）の検討を推奨',
      description: evaluation.reasons.join(' / '),
      evidence: [
        ...evaluation.hardBoundaryHits.map((hit) => hit.file),
        evaluation.suggestedBranch,
        evaluation.suggestedWorktreePath,
      ],
      nextAction: evaluation.nextActions.join(' → '),
    }),
  ];
}

function changedFileTouchesArea(files, area) {
  const normalizedArea = String(area ?? '').replace(/[^A-Za-z0-9_-]/g, '');
  if (!normalizedArea) return false;

  const prefixes = [
    `src/pages/${normalizedArea}/`,
    `src/features/${normalizedArea}/`,
    `src/components/${normalizedArea}/`,
  ];

  return files.some((file) => prefixes.some((prefix) => file.startsWith(prefix)));
}

function collectSsotFindings(files) {
  const report = runJson('node', ['scripts/ssot-debt-report.mjs', '--json']);
  if (!report || report.summary.total === 0) return [];

  const touchedPriorityArea = report.summary.priority.some((area) => changedFileTouchesArea(files, area.area));
  const severity = report.summary.errors > 0 && touchedPriorityArea ? 'stop' : 'warn';
  const priority = report.summary.priority
    .slice(0, 3)
    .map((area) => `${area.area}: total=${area.total}, errors=${area.errors}, warnings=${area.warnings}`);

  return [
    buildFinding({
      type: 'ssot-debt',
      severity,
      title: 'SSoT再実装候補を検知',
      description: touchedPriorityArea
        ? '変更対象領域にSSoT再実装候補があります。既存SSoTを import して使えるか確認し、1回に1領域だけ扱ってください。'
        : '既存のSSoT再実装候補があります。今回の変更由来かを確認し、必要なら別タスクで1領域ずつ扱ってください。',
      evidence: priority.length > 0 ? priority : ['scripts/ssot-debt-report.mjs'],
      nextAction: 'pnpm run loop:ssot で対象領域を絞り、必要なら人間確認へ回してください。',
    }),
  ];
}

function summarize(findings) {
  return {
    total: findings.length,
    stop: findings.filter((finding) => finding.severity === 'stop').length,
    warn: findings.filter((finding) => finding.severity === 'warn').length,
    info: findings.filter((finding) => finding.severity === 'info').length,
  };
}

function buildReport() {
  if (!tryGit(['rev-parse', '--is-inside-work-tree'])) {
    return {
      generatedAt: new Date().toISOString(),
      baseRef,
      changedFiles: [],
      summary: { total: 1, stop: 1, warn: 0, info: 0 },
      findings: [
        buildFinding({
          type: 'environment',
          severity: 'stop',
          title: 'Git管理外のため発見できません',
          description: '差分と状態を評価するにはGitリポジトリ内で実行する必要があります。',
          evidence: [],
          nextAction: 'Gitリポジトリ内で実行してください。',
        }),
      ],
    };
  }

  const changedFiles = listChangedFiles();
  const projectConfig = loadProjectBoundaryConfig(boundaryConfigPath);
  const findings = [
    ...collectHardBoundaryFindings(changedFiles, projectConfig),
    ...collectIsolationFindings(changedFiles),
    ...collectSsotFindings(changedFiles),
    ...collectUiFindings(changedFiles),
    ...collectLoopHarnessFindings(changedFiles),
  ];

  return {
    generatedAt: new Date().toISOString(),
    baseRef,
    changedFiles,
    summary: summarize(findings),
    findings,
  };
}

function printHuman(report) {
  console.log('[loop:discover] 発見結果');
  console.log(`baseRef: ${report.baseRef}`);
  console.log(`findings: total=${report.summary.total}, stop=${report.summary.stop}, warn=${report.summary.warn}`);
  console.log('');

  if (report.findings.length === 0) {
    console.log('- 発見事項はありません。');
    return;
  }

  for (const finding of report.findings) {
    console.log(`- ${finding.severity.toUpperCase()} [${finding.type}] ${finding.title}`);
    console.log(`  ${finding.description}`);
    if (finding.evidence.length > 0) {
      console.log(`  evidence: ${finding.evidence.join(', ')}`);
    }
    console.log(`  next: ${finding.nextAction}`);
  }
}

function persistState(report) {
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

const report = buildReport();

if (writeState) {
  persistState(report);
}

if (jsonMode) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printHuman(report);
}
