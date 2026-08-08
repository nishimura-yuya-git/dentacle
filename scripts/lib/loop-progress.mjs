/**
 * Loop Engineering: No progress 検知（Same failure signature）。
 *
 * 期待値根拠:
 * - loops/goals/bug-fix.md「同じ失敗が 2 回続く場合は人間確認」
 * - docs/agent-loop-harness.md（Loop のブレーキ: Max iterations / No progress / Completion）
 *
 * 生成役が同じ修正を繰り返すのを防ぐため、評価シグネチャの連続一致を機械検知する。
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export const DEFAULT_PROGRESS_PATH = 'state/loop-progress.json';
export const DEFAULT_SAME_FAILURE_LIMIT = 2;
export const DEFAULT_HISTORY_LIMIT = 20;

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240);
}

/**
 * 失敗っぽい判定かどうか（pass はストリークを切る）。
 * @param {string | undefined} status
 */
export function isFailureLike(status) {
  return status === 'stop' || status === 'warn';
}

/**
 * 評価結果から比較用シグネチャを作る。
 * 「同じ call & args」の近似として、判定ステータス・理由・主要 finding を使う。
 */
export function buildFailureSignature({
  evaluationDecision = null,
  discoveryFindings = [],
  verdictStatus = null,
} = {}) {
  const findingKeys = (discoveryFindings ?? [])
    .filter((finding) => finding.severity === 'stop' || finding.severity === 'warn')
    .map((finding) => `${finding.severity}:${finding.type}:${normalizeText(finding.title)}`)
    .sort();

  const payload = [
    `verdict:${normalizeText(verdictStatus)}`,
    `eval:${normalizeText(evaluationDecision?.status)}:${normalizeText(evaluationDecision?.reason)}`,
    `findings:${findingKeys.join('|')}`,
  ].join('\n');

  return createHash('sha256').update(payload).digest('hex').slice(0, 24);
}

/**
 * 履歴へ1回分を追加する（純関数）。
 */
export function appendProgressAttempt(state, attempt, { historyLimit = DEFAULT_HISTORY_LIMIT } = {}) {
  const previous = Array.isArray(state?.attempts) ? state.attempts : [];
  const attempts = [...previous, attempt].slice(-historyLimit);
  return {
    version: 1,
    updatedAt: attempt.at ?? new Date().toISOString(),
    attempts,
  };
}

/**
 * 末尾の連続失敗が同じシグネチャなら No progress。
 * stop 相当の連続のみ自動停止対象。warn 連続は警告に留める。
 */
export function detectNoProgress(attempts, { sameFailureLimit = DEFAULT_SAME_FAILURE_LIMIT } = {}) {
  if (!Array.isArray(attempts) || attempts.length < sameFailureLimit) {
    return { noProgress: false, severity: null, count: 0, signature: null, reason: null, nextAction: null };
  }

  const trailing = attempts.slice(-sameFailureLimit);
  const signature = trailing[0]?.signature;
  if (!signature) {
    return { noProgress: false, severity: null, count: 0, signature: null, reason: null, nextAction: null };
  }

  const allSameFailure = trailing.every(
    (attempt) => attempt.failureLike === true && attempt.signature === signature,
  );
  if (!allSameFailure) {
    return { noProgress: false, severity: null, count: 0, signature: null, reason: null, nextAction: null };
  }

  const allStop = trailing.every((attempt) => attempt.status === 'stop');
  const severity = allStop ? 'stop' : 'warn';

  return {
    noProgress: true,
    severity,
    count: sameFailureLimit,
    signature,
    reason: allStop
      ? `同じ失敗シグネチャが ${sameFailureLimit} 回連続しました（No progress）。自動続行を止め、方針変更または人間確認へ回してください。`
      : `同じ警告シグネチャが ${sameFailureLimit} 回連続しています（No progress 警告）。同じ手を繰り返さず、根拠付きで方針を変えてください。`,
    nextAction: allStop
      ? '失敗理由を読み、別の修正方針にするか人間確認へエスカレーションしてください。'
      : '警告の根拠を Evidence Map に残し、同じ修正の再実行を避けてください。',
  };
}

export function loadProgressState(filePath = DEFAULT_PROGRESS_PATH) {
  if (!existsSync(filePath)) return { version: 1, updatedAt: null, attempts: [] };
  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
    return {
      version: parsed.version ?? 1,
      updatedAt: parsed.updatedAt ?? null,
      attempts: Array.isArray(parsed.attempts) ? parsed.attempts : [],
    };
  } catch {
    return {
      version: 1,
      updatedAt: null,
      attempts: [],
      error: `進捗ファイルを解析できません: ${filePath}`,
    };
  }
}

export function saveProgressState(state, filePath = DEFAULT_PROGRESS_PATH) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

/**
 * 今回の判定を記録し、No progress を返す。
 */
export function recordAndDetectProgress({
  filePath = DEFAULT_PROGRESS_PATH,
  evaluationDecision = null,
  discoveryFindings = [],
  verdictStatus = null,
  sameFailureLimit = DEFAULT_SAME_FAILURE_LIMIT,
  historyLimit = DEFAULT_HISTORY_LIMIT,
  disabled = process.env.LOOP_PROGRESS_DISABLE === '1',
  record = true,
} = {}) {
  const previous = loadProgressState(filePath);
  const signature = buildFailureSignature({
    evaluationDecision,
    discoveryFindings,
    verdictStatus,
  });
  const attempt = {
    at: new Date().toISOString(),
    signature,
    status: verdictStatus,
    failureLike: isFailureLike(verdictStatus),
    evalStatus: evaluationDecision?.status ?? null,
    evalReason: normalizeText(evaluationDecision?.reason),
  };

  // 参照専用（loop:context 経由など）では履歴を増やさず、現状履歴だけで判定する
  if (disabled) {
    return {
      disabled: true,
      recorded: false,
      detection: {
        noProgress: false,
        severity: null,
        count: 0,
        signature: null,
        reason: null,
        nextAction: null,
      },
      state: previous,
      attempt: null,
    };
  }

  if (!record) {
    const detection = detectNoProgress(previous.attempts, { sameFailureLimit });
    return {
      disabled: false,
      recorded: false,
      detection,
      state: previous,
      attempt: null,
    };
  }

  const nextState = appendProgressAttempt(previous, attempt, { historyLimit });
  saveProgressState(nextState, filePath);
  const detection = detectNoProgress(nextState.attempts, { sameFailureLimit });

  return {
    disabled: false,
    recorded: true,
    detection,
    state: nextState,
    attempt,
  };
}
