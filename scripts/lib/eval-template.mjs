/**
 * 薄い Eval Template 層（Future AGI の template→score 思想のみ）。
 *
 * 期待値根拠:
 * - loops/evals/README.md
 * - loops/goals/*.md の完成条件
 * - docs/agent-loop-harness.md §23
 *
 * LLM-as-judge や外部評価 SDK には依存しない。
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const DEFAULT_EVAL_DIR = 'loops/evals';

const GOAL_TEMPLATE_MAP = {
  'bug-fix': 'bug-fix.completion.json',
  'ui-polish': 'ui-polish.completion.json',
  'main-doctor': 'main-doctor.json',
  'regression-guard': 'regression-guard.json',
  'ssot-debt': 'main-doctor.json',
};

/**
 * @param {string} filePath
 */
export function loadEvalTemplate(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Eval template が見つかりません: ${filePath}`);
  }
  const raw = JSON.parse(readFileSync(filePath, 'utf8'));
  if (!raw?.id || !Array.isArray(raw.criteria)) {
    throw new Error(`Eval template の形式が不正です: ${filePath}`);
  }
  return raw;
}

/**
 * @param {string} dir
 */
export function listEvalTemplates(dir = DEFAULT_EVAL_DIR) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => loadEvalTemplate(join(dir, name)));
}

/**
 * goal 名から template パスを解決する。
 * @param {string} goal
 * @param {string} dir
 */
export function resolveTemplatePathForGoal(goal, dir = DEFAULT_EVAL_DIR) {
  const key = String(goal || '')
    .trim()
    .toLowerCase();
  const fileName = GOAL_TEMPLATE_MAP[key];
  if (!fileName) return null;
  const filePath = join(dir, fileName);
  return existsSync(filePath) ? filePath : null;
}

/**
 * 完成宣言テキストと evaluator 結果から採点用信号を作る。
 */
export function buildScoreContext({
  declarationText = '',
  parsed = null,
  evaluationResult = null,
  groundingStatus = null,
  verdictStatus = null,
} = {}) {
  const text = String(declarationText ?? '');
  const result =
    evaluationResult ??
    parsed?.evaluationResult ??
    (typeof verdictStatus === 'string' ? verdictStatus : null);

  return {
    hasEvaluationCommand: Boolean(parsed?.hasEvaluationCommand),
    hasEvaluationResult: Boolean(parsed?.hasEvaluationResult || result),
    hasEvidenceLink: Boolean(parsed?.hasEvidenceLink),
    hasMemoryRef: Boolean(parsed?.hasMemoryRef),
    // verdictStatus は HB 等の別理由 stop を含みうるため、Evaluation 結果判定には使わない
    evaluationNotStop: result !== 'stop' && groundingStatus !== 'stop',
    hasIteration: /iteration\s*[:：]/i.test(text),
    hasInterfaceReview: /better-interface|Interface Review|Verdict/i.test(text),
    // 未使用でも呼び出し側互換のため残す
    verdictStatus,
  };
}

function criterionPassed(criterion, signals) {
  const requiredSignals = Array.isArray(criterion.signals) ? criterion.signals : [];
  if (requiredSignals.length === 0) return false;
  return requiredSignals.every((name) => Boolean(signals?.[name]));
}

/**
 * template を信号に当てて score を返す。
 *
 * @returns {{
 *   status: 'pass' | 'warn' | 'stop',
 *   templateId: string,
 *   scores: Array<{ id: string, label: string, required: boolean, passed: boolean }>,
 *   missingRequired: string[],
 *   reason: string,
 * }}
 */
export function scoreEvalTemplate(template, signals = {}) {
  const scores = (template.criteria ?? []).map((criterion) => {
    const passed = criterionPassed(criterion, signals);
    return {
      id: criterion.id,
      label: criterion.label ?? criterion.id,
      required: Boolean(criterion.required),
      passed,
    };
  });

  const missingRequired = scores
    .filter((item) => item.required && !item.passed)
    .map((item) => item.id);

  const missingOptional = scores
    .filter((item) => !item.required && !item.passed)
    .map((item) => item.id);

  let status = 'pass';
  let reason = `Eval template \`${template.id}\` を満たしています。`;

  if (missingRequired.length > 0) {
    status = 'stop';
    reason = `必須 criteria が不足しています: ${missingRequired.join(', ')}`;
  } else if (missingOptional.length > 0) {
    status = 'warn';
    reason = `任意 criteria が未充足です: ${missingOptional.join(', ')}`;
  }

  return {
    status,
    templateId: template.id,
    scores,
    missingRequired,
    reason,
  };
}

/**
 * goal + 宣言テキストから一括採点する。
 */
export function scoreGoalDeclaration({
  goal,
  declarationText = '',
  parsed = null,
  evaluationResult = null,
  groundingStatus = null,
  verdictStatus = null,
  evalDir = DEFAULT_EVAL_DIR,
} = {}) {
  const templatePath = resolveTemplatePathForGoal(goal, evalDir);
  if (!templatePath) {
    return {
      status: 'skip',
      reason: `goal=${goal} に対応する Eval template がありません。`,
      templateId: null,
      scores: [],
      missingRequired: [],
    };
  }

  const template = loadEvalTemplate(templatePath);
  const signals = buildScoreContext({
    declarationText,
    parsed,
    evaluationResult,
    groundingStatus,
    verdictStatus,
  });
  return {
    ...scoreEvalTemplate(template, signals),
    path: templatePath,
  };
}
