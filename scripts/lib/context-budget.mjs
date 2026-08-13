/**
 * Context Engineering: Finite budget（Select / compress / drop）。
 *
 * unit of work = what stays in the window
 * - must: 必ず窓に残す
 * - compress: 先頭 N 行だけ
 * - drop: 今回の goal / 差分に不要なら落とす
 */

/** @typedef {'must' | 'compress'} ContextTier */

/**
 * @typedef {object} ContextSourceSpec
 * @property {string} path
 * @property {ContextTier} tier
 * @property {number} maxLines
 * @property {boolean} [always]
 * @property {string[]} [goals]
 * @property {boolean} [whenUiChange]
 * @property {boolean} [whenCoreChange]
 */

/** @type {ContextSourceSpec[]} */
export const SOURCE_CATALOG = [
  { path: 'PROJECT_MEMORY.md', tier: 'must', maxLines: 60, always: true },
  { path: '.cursor/rules/safety.mdc', tier: 'must', maxLines: 40, always: true },
  { path: '.cursor/rules/agent-loops.mdc', tier: 'must', maxLines: 40, always: true },
  { path: '.cursor/rules/change-contract.mdc', tier: 'must', maxLines: 40, always: true },
  { path: '.cursor/rules/invariants.mdc', tier: 'compress', maxLines: 25, always: true },
  { path: '.cursor/rules/architecture-extension.mdc', tier: 'compress', maxLines: 25, always: true },

  { path: 'loops/goals/main-doctor.md', tier: 'compress', maxLines: 30, goals: ['main-doctor'] },

  { path: 'loops/goals/bug-fix.md', tier: 'must', maxLines: 50, goals: ['bug-fix'] },
  { path: 'loops/graphs/bug-fix.mmd', tier: 'compress', maxLines: 40, goals: ['bug-fix'] },

  { path: 'loops/goals/ui-polish-gate.md', tier: 'must', maxLines: 60, goals: ['ui-polish'] },
  { path: 'loops/goals/ui-polish.md', tier: 'must', maxLines: 90, goals: ['ui-polish'] },
  { path: 'loops/graphs/ui-polish.mmd', tier: 'compress', maxLines: 40, goals: ['ui-polish'] },
  { path: '.cursor/skills/better-interface/SKILL.md', tier: 'compress', maxLines: 35, goals: ['ui-polish'] },
  { path: '.cursor/skills/better-ui/SKILL.md', tier: 'compress', maxLines: 30, goals: ['ui-polish'], whenUiChange: true },
  { path: '.cursor/rules/ui-design.mdc', tier: 'must', maxLines: 40, goals: ['ui-polish'], whenUiChange: true },
  { path: '.cursor/rules/ui-design-hp-lp.mdc', tier: 'compress', maxLines: 30, goals: ['ui-polish'] },
  { path: '.cursor/rules/ui-language.mdc', tier: 'compress', maxLines: 25, goals: ['ui-polish'], whenUiChange: true },

  { path: 'loops/goals/regression-guard.md', tier: 'must', maxLines: 40, goals: ['regression-guard', 'bug-fix', 'ui-polish', 'ssot-debt'] },
  { path: 'loops/graphs/regression-guard.mmd', tier: 'compress', maxLines: 40, goals: ['regression-guard', 'bug-fix', 'ui-polish', 'ssot-debt'] },

  { path: 'loops/goals/ssot-debt-hunter.md', tier: 'must', maxLines: 40, goals: ['ssot-debt'] },
];

export const DEFAULT_BUDGET = {
  mustMaxLines: 90,
  compressMaxLines: 30,
  // goal 文書 + Hard Gate + 三つの Agent Prompt 定型 + graph + UI ルール + Interface Review スキルが同時に残る余地を確保
  maxSelectedSources: 18,
}

function isUiChange(changedFiles = []) {
  return changedFiles.some(
    (file) => file.startsWith('src/pages/') || file.startsWith('src/components/'),
  );
}

function isCoreChange(changedFiles = []) {
  return changedFiles.some(
    (file) =>
      file.startsWith('src/utils/') ||
      file.startsWith('src/lib/') ||
      file.startsWith('api/') ||
      file.startsWith('supabase/'),
  );
}

function matchesGoal(spec, goal) {
  if (!spec.goals || spec.goals.length === 0) return false;
  return spec.goals.includes(goal);
}

/**
 * goal / 差分に応じて Select / drop する。
 */
export function selectContextSources({
  goal = 'main-doctor',
  changedFiles = [],
  catalog = SOURCE_CATALOG,
  budget = DEFAULT_BUDGET,
} = {}) {
  const ui = isUiChange(changedFiles);
  const core = isCoreChange(changedFiles);
  /** @type {Array<ContextSourceSpec & { selectReason: string }>} */
  const selected = [];
  /** @type {Array<{ path: string, reason: string }>} */
  const dropped = [];

  for (const spec of catalog) {
    if (spec.always) {
      selected.push({ ...spec, selectReason: 'always' });
      continue;
    }

    if (matchesGoal(spec, goal)) {
      selected.push({ ...spec, selectReason: `goal:${goal}` });
      continue;
    }

    if (spec.whenUiChange && ui) {
      selected.push({ ...spec, selectReason: 'ui-change' });
      continue;
    }

    if (spec.whenCoreChange && core) {
      selected.push({ ...spec, selectReason: 'core-change' });
      continue;
    }

    dropped.push({
      path: spec.path,
      reason: `goal=${goal} / 差分条件に非該当のため drop`,
    });
  }

  // Finite budget: must を優先し、超過分は compress → drop へ落とす
  const must = selected.filter((item) => item.tier === 'must');
  const compress = selected.filter((item) => item.tier === 'compress');
  const max = budget.maxSelectedSources ?? DEFAULT_BUDGET.maxSelectedSources;
  const kept = [...must, ...compress].slice(0, max);
  const overflow = [...must, ...compress].slice(max);

  for (const item of overflow) {
    dropped.push({
      path: item.path,
      reason: `budget: maxSelectedSources=${max} 超過のため drop`,
    });
  }

  return {
    goal,
    budget: {
      mustMaxLines: budget.mustMaxLines ?? DEFAULT_BUDGET.mustMaxLines,
      compressMaxLines: budget.compressMaxLines ?? DEFAULT_BUDGET.compressMaxLines,
      maxSelectedSources: max,
    },
    selected: kept.map((item) => ({
      path: item.path,
      tier: item.tier,
      maxLines:
        item.tier === 'must'
          ? Math.min(item.maxLines, budget.mustMaxLines ?? DEFAULT_BUDGET.mustMaxLines)
          : Math.min(item.maxLines, budget.compressMaxLines ?? DEFAULT_BUDGET.compressMaxLines),
      selectReason: item.selectReason,
    })),
    dropped,
  };
}

/**
 * 読み込み行数を tier に合わせて圧縮する。
 */
export function compressSnippet(text, maxLines) {
  if (text == null) return null;
  const lines = String(text).split('\n');
  if (lines.length <= maxLines) return String(text);
  return `${lines.slice(0, maxLines).join('\n')}\n…（context budget: ${maxLines} 行で compress）`;
}
