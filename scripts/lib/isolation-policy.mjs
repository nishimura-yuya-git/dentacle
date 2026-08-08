/**
 * 危険差分の隔離方針（Phase E）。
 * shadow-branch / git worktree の推奨・必須判定。
 */
import {
  DEFAULT_BOUNDARY_CONFIG_PATH,
  getProtectedPatterns,
  matchHardBoundary,
  normalizeProjectPath,
} from './hard-boundary-policy.mjs';
import { GATE_MODES, loadChangeContractGate } from './change-contract-gate.mjs';

export const WORKTREES_DIR = '.worktrees';

/**
 * @returns {{
 *   level: 'none' | 'recommend' | 'required',
 *   reasons: string[],
 *   hardBoundaryHits: Array<{file: string, label: string}>,
 *   suggestedBranch: string,
 *   suggestedWorktreePath: string,
 *   nextActions: string[],
 * }}
 */
export function evaluateIsolationNeed(options = {}) {
  const files = (options.files || []).map(normalizeProjectPath);
  const gate = options.gate || loadChangeContractGate(options.gatePath);
  const { patterns } = getProtectedPatterns(options.boundaryConfigPath || DEFAULT_BOUNDARY_CONFIG_PATH);

  const hardBoundaryHits = [];
  for (const file of files) {
    const hit = matchHardBoundary(file, patterns);
    if (hit.matched) hardBoundaryHits.push(hit);
  }

  const reasons = [];
  let level = 'none';

  if (hardBoundaryHits.length > 0) {
    level = 'required';
    reasons.push(
      `Hard Boundary 差分あり: ${hardBoundaryHits
        .map((hit) => `${hit.label}:${hit.file}`)
        .join(', ')}`,
    );
  }

  if (gate.mode === GATE_MODES.approved && (gate.whitelist || []).length > 0) {
    const touchesApprovedHb = hardBoundaryHits.length > 0;
    if (touchesApprovedHb) {
      level = 'required';
      reasons.push('変更契約 approved かつ Hard Boundary を編集中。main 直編集は隔離推奨を超えて必須扱いにする。');
    } else if (level === 'none') {
      level = 'recommend';
      reasons.push('変更契約が approved。長時間・複数案なら shadow/worktree を検討。');
    }
  }

  if (gate.mode === GATE_MODES.pending && level === 'none') {
    level = 'recommend';
    reasons.push('変更契約が pending。実装開始前に隔離方針を決めておくと戻しやすい。');
  }

  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, '').slice(0, 13);
  const slug = options.name
    ? String(options.name).replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '')
    : `hb-${stamp}`;
  const suggestedBranch = `shadow/${slug}`;
  const suggestedWorktreePath = `${WORKTREES_DIR}/${slug}`;

  const nextActions = [];
  if (level === 'none') {
    nextActions.push('隔離は不要。main-safe のまま進められる。');
  } else {
    nextActions.push(`pnpm run isolate:status`);
    nextActions.push(`pnpm run isolate:worktree -- --name ${slug}`);
    nextActions.push('隔離先で実装・検証し、問題なければパッチ/PR化する');
    nextActions.push('main の未コミット差分を勝手に捨てない');
    if (level === 'required') {
      nextActions.push('Hard Boundary 編集は session-allow + 変更契約承認を併用する');
    }
  }

  return {
    level,
    reasons,
    hardBoundaryHits,
    suggestedBranch,
    suggestedWorktreePath,
    nextActions,
  };
}
