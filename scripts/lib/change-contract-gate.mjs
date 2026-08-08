/**
 * 変更契約ゲート（Phase B）。
 * pending 中は編集禁止、approved 中は whitelist のみ許可。
 */
import { existsSync, readFileSync } from 'node:fs';
import { normalizeProjectPath } from './hard-boundary-policy.mjs';

export const CHANGE_CONTRACT_GATE_PATH = '.cursor/change-contract-gate.json';

export const GATE_MODES = Object.freeze({
  open: 'open',
  pending: 'pending',
  approved: 'approved',
});

export function isContractGateBypassEnabled(env = process.env) {
  const value = String(env.CHANGE_CONTRACT_GATE_ALLOW || '').trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
}

export function isGateFilePath(relativePath) {
  return normalizeProjectPath(relativePath) === CHANGE_CONTRACT_GATE_PATH;
}

function normalizePathList(values) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((value) => normalizeProjectPath(String(value))).filter(Boolean))];
}

function isExpired(expiresAt) {
  if (typeof expiresAt !== 'string' || !expiresAt.trim()) return false;
  const expiresMs = Date.parse(expiresAt);
  if (Number.isNaN(expiresMs)) return false;
  return Date.now() > expiresMs;
}

/**
 * @returns {{
 *   mode: 'open' | 'pending' | 'approved',
 *   reason: string | null,
 *   whitelist: string[],
 *   proposed_whitelist: string[],
 *   expires_at: string | null,
 *   expired: boolean,
 *   errors: string[],
 *   source: 'missing' | 'file',
 * }}
 */
export function loadChangeContractGate(gatePath = CHANGE_CONTRACT_GATE_PATH) {
  if (!existsSync(gatePath)) {
    return {
      mode: GATE_MODES.open,
      reason: null,
      whitelist: [],
      proposed_whitelist: [],
      expires_at: null,
      expired: false,
      errors: [],
      source: 'missing',
    };
  }

  try {
    const raw = JSON.parse(readFileSync(gatePath, 'utf8'));
    const modeRaw = typeof raw.mode === 'string' ? raw.mode.trim() : GATE_MODES.open;
    const mode = Object.values(GATE_MODES).includes(modeRaw) ? modeRaw : null;

    if (!mode) {
      return {
        mode: GATE_MODES.open,
        reason: null,
        whitelist: [],
        proposed_whitelist: [],
        expires_at: null,
        expired: false,
        errors: [`${gatePath} の mode が不正です（open / pending / approved）。`],
        source: 'file',
      };
    }

    const expiresAt = typeof raw.expires_at === 'string' ? raw.expires_at.trim() : null;
    const expired = isExpired(expiresAt);

    // 期限切れの approved/pending は open 相当へ倒す（ロック固定を避ける）
    const effectiveMode =
      expired && (mode === GATE_MODES.approved || mode === GATE_MODES.pending)
        ? GATE_MODES.open
        : mode;

    return {
      mode: effectiveMode,
      reason: typeof raw.reason === 'string' && raw.reason.trim() ? raw.reason.trim() : null,
      whitelist: normalizePathList(raw.whitelist),
      proposed_whitelist: normalizePathList(raw.proposed_whitelist),
      expires_at: expiresAt,
      expired,
      errors: [],
      source: 'file',
    };
  } catch (error) {
    return {
      mode: GATE_MODES.open,
      reason: null,
      whitelist: [],
      proposed_whitelist: [],
      expires_at: null,
      expired: false,
      errors: [
        `${gatePath} の読み込みに失敗しました: ${
          error instanceof Error ? error.message : String(error)
        }`,
      ],
      source: 'file',
    };
  }
}

export function isPathInWhitelist(relativePath, whitelist) {
  const normalized = normalizeProjectPath(relativePath);
  return normalizePathList(whitelist).some((entry) => {
    if (entry.endsWith('/')) {
      return normalized === entry.slice(0, -1) || normalized.startsWith(entry);
    }
    return normalized === entry;
  });
}

/**
 * 変更契約ゲートの判定。
 * @returns {{ decision: 'allow' | 'deny', code: string, userMessage?: string, agentMessage?: string }}
 */
export function evaluateChangeContractGate(relativePath, options = {}) {
  const env = options.env || process.env;
  const gatePath = options.gatePath || CHANGE_CONTRACT_GATE_PATH;

  if (isContractGateBypassEnabled(env)) {
    return { decision: 'allow', code: 'contract-bypass' };
  }

  if (isGateFilePath(relativePath)) {
    return {
      decision: 'deny',
      code: 'gate-file-protected',
      userMessage:
        '変更契約ゲートファイルは Write ツールでは編集できません。pnpm run contract:pending / contract:approve / contract:close を使ってください。',
      agentMessage: [
        '変更契約ゲートファイルへの直接編集は禁止されています。',
        `- 対象: ${CHANGE_CONTRACT_GATE_PATH}`,
        '',
        '代わりに CLI を使ってください:',
        '- pnpm run contract:pending -- --reason "変更契約提示" path1 path2',
        '- pnpm run contract:approve -- --reason "ユーザー承認: 進めて"',
        '- pnpm run contract:close',
        '- pnpm run contract:status',
      ].join('\n'),
    };
  }

  const gate = loadChangeContractGate(gatePath);

  if (gate.errors.length > 0) {
    return {
      decision: 'deny',
      code: 'gate-config-error',
      userMessage: `変更契約ゲート設定エラー: ${gate.errors.join(' / ')}`,
      agentMessage: `変更契約ゲートが不正です。編集を中止し、設定を確認してください。\n- ${gate.errors.join('\n- ')}`,
    };
  }

  if (gate.mode === GATE_MODES.pending) {
    return {
      decision: 'deny',
      code: 'contract-pending',
      userMessage:
        '変更契約が未承認（pending）のため編集をブロックしました。ユーザー承認後に pnpm run contract:approve を実行してください。',
      agentMessage: [
        '変更契約ゲートが pending です。実装編集は承認後のみ可能です。',
        `- reason: ${gate.reason || '(なし)'}`,
        `- proposed_whitelist: ${gate.proposed_whitelist.join(', ') || '(なし)'}`,
        '',
        '次に行うこと:',
        '1. 変更契約をチャットに提示済みか確認する',
        '2. ユーザーの「OK」「進めて」等の承認を待つ',
        '3. pnpm run contract:approve -- --reason "ユーザー承認: …" を実行する',
        '4. 承認後に whitelist 内だけを編集する',
        '',
        '承認前に実装へ進まないでください。',
      ].join('\n'),
    };
  }

  if (gate.mode === GATE_MODES.approved) {
    if (gate.whitelist.length === 0) {
      return {
        decision: 'deny',
        code: 'approved-empty-whitelist',
        userMessage:
          '変更契約は approved ですが whitelist が空です。contract:approve でパスを指定するか、contract:close してください。',
        agentMessage:
          'approved ゲートに whitelist がありません。編集せず、approve のパス指定または close を行ってください。',
      };
    }

    if (!isPathInWhitelist(relativePath, gate.whitelist)) {
      return {
        decision: 'deny',
        code: 'not-in-whitelist',
        userMessage: `変更契約 whitelist 外の編集をブロックしました: ${normalizeProjectPath(relativePath)}`,
        agentMessage: [
          '変更契約の whitelist に含まれないパスへの編集は拒否されました。',
          `- 対象: ${normalizeProjectPath(relativePath)}`,
          `- whitelist: ${gate.whitelist.join(', ')}`,
          `- reason: ${gate.reason || '(なし)'}`,
          '',
          'whitelist を拡大する場合は、変更契約を更新してユーザー承認後に再 approve してください。',
        ].join('\n'),
      };
    }
  }

  return { decision: 'allow', code: 'contract-open-or-whitelisted' };
}
