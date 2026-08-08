#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { auditProjectMemoryFile } from './lib/memory-audit.mjs';
import { compressSnippet, selectContextSources } from './lib/context-budget.mjs';
import {
  DEFAULT_WORKING_GRAPH_PATH,
  loadWorkingGraph,
  summarizeWorkingGraph,
} from './lib/working-graph.mjs';

const jsonMode = process.argv.includes('--json');
const baseRef = process.env.LOOP_BASE || 'HEAD';
const statePath = process.env.LOOP_STATE_FILE || 'state/loop-findings.json';
const workingGraphPath = process.env.WORKING_GRAPH_FILE || DEFAULT_WORKING_GRAPH_PATH;

function parseGoal() {
  const goalArg = process.argv.find((arg) => arg.startsWith('--goal='));
  if (goalArg) return goalArg.split('=')[1] || 'main-doctor';
  if (process.env.LOOP_GOAL) return process.env.LOOP_GOAL;
  return 'main-doctor';
}

const goal = parseGoal();

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

function readFirstLines(filePath, maxLines = 40) {
  if (!existsSync(filePath)) return null;
  const lines = readFileSync(filePath, 'utf8').split('\n').slice(0, maxLines);
  return lines.join('\n');
}

function runEvaluateJson() {
  const result = spawnSync('node', ['scripts/loop-evaluate.mjs', '--json'], {
    encoding: 'utf8',
    shell: false,
  });
  try {
    return JSON.parse(result.stdout);
  } catch {
    return {
      decision: {
        status: 'stop',
        reason: 'loop-evaluate のJSONを解析できませんでした。',
        nextAction: 'npm run loop:evaluate を直接確認してください。',
      },
      raw: result.stdout,
      error: result.stderr,
    };
  }
}

function runDiscoverJson() {
  const result = spawnSync('node', ['scripts/loop-discover.mjs', '--json'], {
    encoding: 'utf8',
    shell: false,
  });
  try {
    return JSON.parse(result.stdout);
  } catch {
    return {
      summary: { total: 1, stop: 1, warn: 0, info: 0 },
      findings: [
        {
          type: 'loop-discover',
          severity: 'stop',
          title: 'loop-discover のJSONを解析できませんでした。',
          nextAction: 'npm run loop:discover を直接確認してください。',
        },
      ],
      raw: result.stdout,
      error: result.stderr,
    };
  }
}

function runEvaluatorJson() {
  const result = spawnSync('node', ['scripts/loop-evaluator.mjs', '--json', '--no-record'], {
    encoding: 'utf8',
    shell: false,
  });
  try {
    return JSON.parse(result.stdout);
  } catch {
    return {
      verdict: {
        status: 'stop',
        reason: 'loop-evaluator のJSONを解析できませんでした。',
        requiredActions: ['npm run loop:evaluator を直接確認してください。'],
      },
      raw: result.stdout,
      error: result.stderr,
    };
  }
}

function readLoopState() {
  if (!existsSync(statePath)) return null;
  try {
    return JSON.parse(readFileSync(statePath, 'utf8'));
  } catch {
    return {
      error: `状態ファイルを解析できません: ${statePath}`,
    };
  }
}

function buildCuratedSources(changedFiles) {
  const selection = selectContextSources({ goal, changedFiles });
  const ruleSnippets = [];

  for (const source of selection.selected) {
    if (!existsSync(source.path)) {
      selection.dropped.push({
        path: source.path,
        reason: 'ファイルが存在しないため drop',
      });
      continue;
    }

    const raw = readFirstLines(source.path, source.maxLines);
    ruleSnippets.push({
      filePath: source.path,
      tier: source.tier,
      maxLines: source.maxLines,
      selectReason: source.selectReason,
      snippet: compressSnippet(raw, source.maxLines),
    });
  }

  return {
    budget: selection.budget,
    goal: selection.goal,
    ruleSnippets,
    dropped: selection.dropped,
  };
}

function buildContext() {
  const changedFiles = listChangedFiles();
  const evaluation = runEvaluateJson();
  const discovery = runDiscoverJson();
  const evaluator = runEvaluatorJson();
  const loopState = readLoopState();
  const memoryAudit = auditProjectMemoryFile('PROJECT_MEMORY.md');
  const curated = buildCuratedSources(changedFiles);
  const workingGraph = loadWorkingGraph(workingGraphPath);
  const workingGraphSummary = summarizeWorkingGraph(workingGraph, {
    maxEntities: 12,
    maxRelations: 12,
  });

  return {
    generatedAt: new Date().toISOString(),
    mode: 'main-safe',
    goal,
    baseRef,
    changedFiles,
    evaluation,
    discovery,
    evaluator,
    loopState,
    memoryAudit,
    workingGraph: {
      path: workingGraphPath,
      unitOfWork: 'shared memory entities/relations (thin knowledge graph)',
      entityCount: workingGraphSummary.entityCount,
      relationCount: workingGraphSummary.relationCount,
      summaryMarkdown: workingGraphSummary.markdown,
      error: workingGraph.error ?? null,
    },
    contextBudget: {
      unitOfWork: 'what stays in the window',
      policy: 'must を残し、それ以外は compress / drop（Finite budget）。working-graph は要約のみ must 相当で載せる',
      budget: curated.budget,
      dropped: curated.dropped,
    },
    ruleSnippets: curated.ruleSnippets,
  };
}

function printMarkdown(context) {
  console.log('# Loop Context（Curated）');
  console.log('');
  console.log(`- generatedAt: ${context.generatedAt}`);
  console.log(`- mode: ${context.mode}`);
  console.log(`- goal: ${context.goal}`);
  console.log(`- baseRef: ${context.baseRef}`);
  console.log(`- decision: ${context.evaluation.decision?.status ?? 'unknown'}`);
  console.log(`- reason: ${context.evaluation.decision?.reason ?? 'unknown'}`);
  console.log('');
  console.log('## Context Budget');
  console.log(`- unit of work: ${context.contextBudget.unitOfWork}`);
  console.log(`- policy: ${context.contextBudget.policy}`);
  console.log(
    `- limits: mustMaxLines=${context.contextBudget.budget.mustMaxLines}, compressMaxLines=${context.contextBudget.budget.compressMaxLines}, maxSelectedSources=${context.contextBudget.budget.maxSelectedSources}`,
  );
  console.log(`- selected: ${context.ruleSnippets.length}`);
  console.log(`- dropped: ${context.contextBudget.dropped.length}`);
  console.log('');
  console.log('## Changed Files');
  if (context.changedFiles.length === 0) {
    console.log('- なし');
  } else {
    for (const file of context.changedFiles) {
      console.log(`- ${file}`);
    }
  }
  console.log('');
  console.log('## Recommended Commands');
  const commands = context.evaluation.recommendedCommands ?? [];
  if (commands.length === 0) {
    console.log('- なし');
  } else {
    for (const command of commands) {
      console.log(`- ${command}`);
    }
  }
  console.log('');
  console.log('## Loop Discovery');
  const findings = context.discovery?.findings ?? [];
  if (findings.length === 0) {
    console.log('- 発見事項なし');
  } else {
    for (const finding of findings.slice(0, 8)) {
      console.log(`- ${finding.severity}: ${finding.title}`);
    }
  }
  console.log('');
  console.log('## Independent Evaluator');
  console.log(`- status: ${context.evaluator?.verdict?.status ?? 'unknown'}`);
  console.log(`- reason: ${context.evaluator?.verdict?.reason ?? 'unknown'}`);
  if (context.evaluator?.progress?.detection?.noProgress) {
    console.log(`- no-progress: ${context.evaluator.progress.detection.severity}`);
  }
  console.log('');
  console.log('## Loop State');
  if (context.loopState) {
    console.log(`- ${statePath}`);
  } else {
    console.log('- なし');
  }
  console.log('');
  console.log('## Working Graph（薄い共有メモリ）');
  if ((context.workingGraph?.entityCount ?? 0) === 0 && (context.workingGraph?.relationCount ?? 0) === 0) {
    console.log('- 空（Bug Fix などで Entity を整理したら pnpm run working-graph で追加）');
  } else {
    console.log(context.workingGraph.summaryMarkdown);
  }
  console.log('');
  console.log('## Claim Grounding');
  console.log(`- status: ${context.evaluator?.claimGrounding?.status ?? 'unknown'}`);
  console.log(`- reason: ${context.evaluator?.claimGrounding?.reason ?? 'unknown'}`);
  console.log('');
  console.log('## PROJECT_MEMORY 要詰め（Memory Tighten）');
  const audit = context.memoryAudit;
  if (!audit?.summary?.total) {
    console.log('- 要詰め箇所なし');
  } else {
    console.log(
      `- critical: ${audit.summary.critical}, high: ${audit.summary.high}, medium: ${audit.summary.medium}`,
    );
    console.log('- 理解レポート §6 に要詰め件数と優先対応を記載すること');
    console.log('- PROJECT_MEMORY は自動編集しない。詰めた内容は /project-memory-learn');
    for (const finding of (audit.findings ?? []).slice(0, 6)) {
      console.log(`- [${finding.severity}] ${finding.section}: ${finding.title}`);
    }
    if ((audit.findings?.length ?? 0) > 6) {
      console.log(`- 他 ${audit.findings.length - 6} 件（pnpm run memory:audit）`);
    }
  }
  console.log('');
  console.log('## Context Sources（selected）');
  for (const rule of context.ruleSnippets) {
    console.log(`- [${rule.tier}] ${rule.filePath} (${rule.selectReason}, ≤${rule.maxLines}行)`);
  }
  console.log('');
  console.log('## Context Sources（dropped）');
  if (context.contextBudget.dropped.length === 0) {
    console.log('- なし');
  } else {
    for (const item of context.contextBudget.dropped.slice(0, 12)) {
      console.log(`- ${item.path}: ${item.reason}`);
    }
    if (context.contextBudget.dropped.length > 12) {
      console.log(`- 他 ${context.contextBudget.dropped.length - 12} 件`);
    }
  }
}

const context = buildContext();
if (jsonMode) {
  console.log(JSON.stringify(context, null, 2));
} else {
  printMarkdown(context);
}
