#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import {
  DEFAULT_DECLARATION_PATH,
  evaluateClaimGrounding,
  parseCompletionDeclaration,
} from './lib/claim-grounding.mjs';
import {
  DEFAULT_EVAL_DIR,
  scoreGoalDeclaration,
} from './lib/eval-template.mjs';
import { classifyEvaluatorReport } from './lib/failure-taxonomy.mjs';
import {
  DEFAULT_PROGRESS_PATH,
  recordAndDetectProgress,
} from './lib/loop-progress.mjs';
import {
  DEFAULT_WORKING_GRAPH_PATH,
  loadWorkingGraph,
  summarizeWorkingGraph,
} from './lib/working-graph.mjs';

const jsonMode = process.argv.includes('--json');
// loop:context などネスト呼び出しでは履歴を増やさない（二重記録で即 No progress になるのを防ぐ）
const noRecord = process.argv.includes('--no-record');
const statePath = process.env.LOOP_STATE_FILE || 'state/loop-findings.json';
const progressPath = process.env.LOOP_PROGRESS_FILE || DEFAULT_PROGRESS_PATH;
const declarationPath = process.env.LOOP_DECLARATION_FILE || DEFAULT_DECLARATION_PATH;
const workingGraphPath = process.env.WORKING_GRAPH_FILE || DEFAULT_WORKING_GRAPH_PATH;
const evalDir = process.env.LOOP_EVAL_DIR || DEFAULT_EVAL_DIR;

function inferGoal(declarationText = '') {
  const fromEnv = String(process.env.LOOP_GOAL || '').trim();
  if (fromEnv) return fromEnv;
  if (/Bug Fix Loop/i.test(declarationText)) return 'bug-fix';
  if (/UI Polish Loop/i.test(declarationText)) return 'ui-polish';
  if (/Regression Guard/i.test(declarationText)) return 'regression-guard';
  if (/SSoT/i.test(declarationText)) return 'ssot-debt';
  return 'main-doctor';
}

function applyEvalTemplate(verdict, { declarationText, parsed, groundingStatus }) {
  if (!declarationText) {
    return {
      verdict: {
        ...verdict,
        evaluatorChecks: [
          ...verdict.evaluatorChecks,
          { name: 'eval-template', result: 'skip' },
        ],
      },
      evalTemplate: {
        status: 'skip',
        reason: '完成宣言がないため Eval template 採点を skip',
        templateId: null,
        scores: [],
        missingRequired: [],
      },
    };
  }

  const goal = inferGoal(declarationText);
  const scored = scoreGoalDeclaration({
    goal,
    declarationText,
    parsed,
    evaluationResult: parsed?.evaluationResult ?? null,
    groundingStatus,
    verdictStatus: verdict.status,
    evalDir,
  });

  const checks = [
    ...verdict.evaluatorChecks,
    {
      name: 'eval-template',
      result: scored.status,
    },
  ];

  if (scored.status === 'skip' || scored.status === 'pass') {
    return {
      verdict: { ...verdict, evaluatorChecks: checks },
      evalTemplate: { ...scored, goal },
    };
  }

  const requiredActions = [
    ...new Set(
      [
        ...(verdict.requiredActions ?? []),
        scored.status === 'stop'
          ? `Eval template（${scored.templateId}）の必須 criteria を完成宣言に埋めてください。`
          : `Eval template（${scored.templateId}）の任意 criteria を確認してください。`,
      ].filter(Boolean),
    ),
  ];

  if (scored.status === 'stop') {
    return {
      verdict: {
        status: 'stop',
        // 既存 stop（HB 等）の理由は上書きしない
        reason: verdict.status === 'stop' ? verdict.reason : scored.reason,
        requiredActions,
        evaluatorChecks: checks,
      },
      evalTemplate: { ...scored, goal },
    };
  }

  return {
    verdict: {
      status: verdict.status === 'stop' ? 'stop' : 'warn',
      reason: verdict.status === 'stop' ? verdict.reason : scored.reason,
      requiredActions,
      evaluatorChecks: checks,
    },
    evalTemplate: { ...scored, goal },
  };
}

function runJson(name, command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    shell: false,
  });

  try {
    return {
      name,
      command: [command, ...args].join(' '),
      status: result.status ?? 1,
      json: JSON.parse(result.stdout),
    };
  } catch {
    return {
      name,
      command: [command, ...args].join(' '),
      status: result.status ?? 1,
      json: null,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
    };
  }
}

function readState() {
  if (!existsSync(statePath)) return null;
  try {
    return JSON.parse(readFileSync(statePath, 'utf8'));
  } catch {
    return {
      error: `状態ファイルを解析できません: ${statePath}`,
    };
  }
}

function buildVerdict({ evaluation, discovery, persistedState }) {
  const reasons = [];
  const requiredActions = [];
  const evaluatorChecks = [];

  const loopDecision = evaluation?.decision;
  if (!loopDecision) {
    reasons.push('loop-evaluate の判定を取得できませんでした。');
    requiredActions.push('npm run loop:evaluate を直接確認してください。');
    evaluatorChecks.push({ name: 'loop-evaluate', result: 'reject' });
  } else {
    evaluatorChecks.push({ name: 'loop-evaluate', result: loopDecision.status });
    if (loopDecision.status === 'stop') {
      reasons.push(loopDecision.reason);
      requiredActions.push(loopDecision.nextAction);
    }
  }

  const findings = discovery?.findings ?? [];
  const stopFindings = findings.filter((finding) => finding.severity === 'stop');
  const warnFindings = findings.filter((finding) => finding.severity === 'warn');

  evaluatorChecks.push({
    name: 'loop-discover',
    result: stopFindings.length > 0 ? 'stop' : warnFindings.length > 0 ? 'warn' : 'pass',
  });

  for (const finding of stopFindings) {
    reasons.push(`${finding.title}: ${finding.description}`);
    requiredActions.push(finding.nextAction);
  }

  if (persistedState?.error) {
    reasons.push(persistedState.error);
    requiredActions.push('状態ファイルを削除または修正してから再評価してください。');
    evaluatorChecks.push({ name: 'state-file', result: 'reject' });
  } else if (persistedState) {
    const openStop = (persistedState.findings ?? []).filter(
      (finding) => finding.status !== 'resolved' && finding.severity === 'stop',
    );
    evaluatorChecks.push({
      name: 'state-file',
      result: openStop.length > 0 ? 'stop' : 'pass',
    });

    for (const finding of openStop) {
      reasons.push(`未解決の停止事項があります: ${finding.title}`);
      requiredActions.push(finding.nextAction);
    }
  } else {
    evaluatorChecks.push({ name: 'state-file', result: 'not-written' });
  }

  if (reasons.length > 0) {
    return {
      status: 'stop',
      reason: reasons[0],
      requiredActions: [...new Set(requiredActions.filter(Boolean))],
      evaluatorChecks,
    };
  }

  if (loopDecision?.status === 'warn' || warnFindings.length > 0) {
    return {
      status: 'warn',
      reason: '独立評価は続行可能ですが、警告があります。',
      requiredActions: [
        ...new Set([
          loopDecision?.status === 'warn' ? loopDecision.nextAction : null,
          ...warnFindings.map((finding) => finding.nextAction),
        ].filter(Boolean)),
      ],
      evaluatorChecks,
    };
  }

  return {
    status: 'pass',
    reason: '独立評価で停止事項は見つかりませんでした。',
    requiredActions: [],
    evaluatorChecks,
  };
}

function applyClaimGrounding(verdict, { evaluation }) {
  const grounding = evaluateClaimGrounding({
    declarationPath,
    changedFiles: evaluation?.changedFiles ?? [],
  });

  const checks = [
    ...verdict.evaluatorChecks,
    {
      name: 'claim-grounding',
      result: grounding.status,
    },
  ];

  if (grounding.status === 'skip' || grounding.status === 'pass') {
    return {
      verdict: { ...verdict, evaluatorChecks: checks },
      grounding,
    };
  }

  const requiredActions = [
    ...new Set([...(verdict.requiredActions ?? []), grounding.nextAction].filter(Boolean)),
  ];

  if (grounding.status === 'stop') {
    return {
      verdict: {
        status: 'stop',
        reason: grounding.reason,
        requiredActions,
        evaluatorChecks: checks,
      },
      grounding,
    };
  }

  // warn: 既存 stop は弱めない
  return {
    verdict: {
      status: verdict.status === 'stop' ? 'stop' : 'warn',
      reason: verdict.status === 'stop' ? verdict.reason : grounding.reason,
      requiredActions,
      evaluatorChecks: checks,
    },
    grounding,
  };
}

function applyNoProgress(verdict, { evaluation, discovery }) {
  const progress = recordAndDetectProgress({
    filePath: progressPath,
    evaluationDecision: evaluation?.decision ?? null,
    discoveryFindings: discovery?.findings ?? [],
    verdictStatus: verdict.status,
    record: !noRecord,
  });

  const checks = [
    ...verdict.evaluatorChecks,
    {
      name: 'no-progress',
      result: progress.disabled
        ? 'disabled'
        : !progress.recorded && !progress.detection.noProgress
          ? 'read-only'
          : progress.detection.noProgress
            ? progress.detection.severity
            : 'pass',
    },
  ];

  if (!progress.detection.noProgress) {
    return {
      verdict: { ...verdict, evaluatorChecks: checks },
      progress,
    };
  }

  const requiredActions = [
    ...new Set([...(verdict.requiredActions ?? []), progress.detection.nextAction].filter(Boolean)),
  ];

  // No progress の理由を前面に出す。stop 連続は必ず stop。warn 連続は stop を弱めない。
  const status =
    progress.detection.severity === 'stop' || verdict.status === 'stop' ? 'stop' : 'warn';

  return {
    verdict: {
      status,
      reason: progress.detection.reason,
      requiredActions,
      evaluatorChecks: checks,
    },
    progress,
  };
}

function buildReport() {
  const evaluationResult = runJson('loop-evaluate', 'node', ['scripts/loop-evaluate.mjs', '--json']);
  const discoveryResult = runJson('loop-discover', 'node', ['scripts/loop-discover.mjs', '--json']);
  const persistedState = readState();
  const workingGraph = loadWorkingGraph(workingGraphPath);
  const workingGraphSummary = summarizeWorkingGraph(workingGraph);
  const declarationText = existsSync(declarationPath)
    ? readFileSync(declarationPath, 'utf8')
    : '';
  const parsedDeclaration = declarationText
    ? parseCompletionDeclaration(declarationText)
    : null;
  const baseVerdict = buildVerdict({
    evaluation: evaluationResult.json,
    discovery: discoveryResult.json,
    persistedState,
  });
  const grounded = applyClaimGrounding(baseVerdict, {
    evaluation: evaluationResult.json,
  });
  const templated = applyEvalTemplate(grounded.verdict, {
    declarationText,
    parsed: parsedDeclaration ?? grounded.grounding.parsed,
    groundingStatus: grounded.grounding.status,
  });
  const { verdict, progress } = applyNoProgress(templated.verdict, {
    evaluation: evaluationResult.json,
    discovery: discoveryResult.json,
  });

  const report = {
    generatedAt: new Date().toISOString(),
    stance: '証明されるまで壊れている前提で、生成役とは別視点から評価する。',
    verdict,
    evaluation: evaluationResult.json,
    discovery: discoveryResult.json,
    claimGrounding: {
      path: declarationPath,
      status: grounded.grounding.status,
      reason: grounded.grounding.reason,
      missing: grounded.grounding.missing,
      parsed: grounded.grounding.parsed,
    },
    evalTemplate: templated.evalTemplate,
    workingGraph: {
      path: workingGraphPath,
      entityCount: workingGraphSummary.entityCount,
      relationCount: workingGraphSummary.relationCount,
      error: workingGraph.error ?? null,
    },
    progress: {
      path: progressPath,
      disabled: progress.disabled,
      recorded: progress.recorded,
      detection: progress.detection,
      attempt: progress.attempt,
      recentAttempts: (progress.state?.attempts ?? []).slice(-5),
    },
    state: persistedState
      ? {
          path: statePath,
          summary: persistedState.summary ?? null,
          error: persistedState.error ?? null,
        }
      : {
          path: statePath,
          summary: null,
          error: null,
        },
  };

  report.failureTaxonomy = classifyEvaluatorReport(report);
  return report;
}

function printHuman(report) {
  console.log('[loop:evaluator] 独立評価結果');
  console.log(`status: ${report.verdict.status}`);
  console.log(`reason: ${report.verdict.reason}`);
  console.log('');
  console.log('checks:');
  for (const check of report.verdict.evaluatorChecks) {
    console.log(`- ${check.name}: ${check.result}`);
  }

  console.log('');
  console.log('claim-grounding:');
  console.log(`- status: ${report.claimGrounding?.status ?? 'unknown'}`);
  console.log(`- reason: ${report.claimGrounding?.reason ?? 'unknown'}`);
  console.log(`- declaration: ${report.claimGrounding?.path ?? declarationPath}`);

  console.log('');
  console.log('eval-template:');
  console.log(`- status: ${report.evalTemplate?.status ?? 'unknown'}`);
  console.log(`- goal: ${report.evalTemplate?.goal ?? '(none)'}`);
  console.log(`- template: ${report.evalTemplate?.templateId ?? '(none)'}`);
  console.log(`- reason: ${report.evalTemplate?.reason ?? 'unknown'}`);

  console.log('');
  console.log('failure-taxonomy:');
  console.log(`- primary: ${report.failureTaxonomy?.primary ?? '(none)'}`);
  for (const item of report.failureTaxonomy?.classes ?? []) {
    console.log(`- ${item.id}: ${item.severity ?? '-'} (${item.evidence ?? ''})`);
  }

  console.log('');
  console.log('working-graph:');
  console.log(
    `- entities: ${report.workingGraph?.entityCount ?? 0}, relations: ${report.workingGraph?.relationCount ?? 0}`,
  );
  console.log(`- path: ${report.workingGraph?.path ?? workingGraphPath}`);

  console.log('');
  console.log('no-progress:');
  if (report.progress?.disabled) {
    console.log('- disabled (LOOP_PROGRESS_DISABLE=1)');
  } else if (report.progress?.detection?.noProgress) {
    console.log(`- ${report.progress.detection.severity}: ${report.progress.detection.reason}`);
    console.log(`- signature: ${report.progress.detection.signature}`);
  } else {
    console.log('- pass（連続同一失敗なし）');
  }

  console.log('');
  console.log('required actions:');
  if (report.verdict.requiredActions.length === 0) {
    console.log('- なし');
  } else {
    for (const action of report.verdict.requiredActions) {
      console.log(`- ${action}`);
    }
  }
}

const report = buildReport();

if (jsonMode) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printHuman(report);
}

if (report.verdict.status === 'stop') {
  process.exit(1);
}
