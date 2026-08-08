/**
 * サブエージェント権限ポリシーの SSoT（Phase C）。
 */
import { existsSync, readFileSync } from 'node:fs';
import {
  GATE_MODES,
  loadChangeContractGate,
} from './change-contract-gate.mjs';
import {
  DEFAULT_BOUNDARY_CONFIG_PATH,
  getProtectedPatterns,
  matchHardBoundary,
  normalizeProjectPath,
} from './hard-boundary-policy.mjs';

export const SUBAGENT_POLICY_PATH = '.cursor/subagent-policy.json';

const DEFAULT_POLICY = {
  read_only_types: ['explore', 'cursor-guide', 'ci-investigator'],
  write_capable_types: ['generalPurpose', 'best-of-n-runner', 'bugbot', 'security-review'],
  shell_types: ['shell'],
  deny_write_types_when_contract_pending: true,
  deny_write_types_for_hard_boundary_task_without_approval: true,
  allow_shell_when_contract_pending: true,
};

function toTypeSet(values) {
  return new Set(
    (Array.isArray(values) ? values : [])
      .map((value) => String(value || '').trim())
      .filter(Boolean),
  );
}

export function loadSubagentPolicy(policyPath = SUBAGENT_POLICY_PATH) {
  if (!existsSync(policyPath)) {
    return { ...DEFAULT_POLICY, errors: [], source: 'default' };
  }

  try {
    const raw = JSON.parse(readFileSync(policyPath, 'utf8'));
    return {
      read_only_types: Array.isArray(raw.read_only_types)
        ? raw.read_only_types.map(String)
        : DEFAULT_POLICY.read_only_types,
      write_capable_types: Array.isArray(raw.write_capable_types)
        ? raw.write_capable_types.map(String)
        : DEFAULT_POLICY.write_capable_types,
      shell_types: Array.isArray(raw.shell_types)
        ? raw.shell_types.map(String)
        : DEFAULT_POLICY.shell_types,
      deny_write_types_when_contract_pending:
        raw.deny_write_types_when_contract_pending !== false,
      deny_write_types_for_hard_boundary_task_without_approval:
        raw.deny_write_types_for_hard_boundary_task_without_approval !== false,
      allow_shell_when_contract_pending: raw.allow_shell_when_contract_pending !== false,
      errors: [],
      source: 'file',
    };
  } catch (error) {
    return {
      ...DEFAULT_POLICY,
      errors: [
        `${policyPath} の読み込みに失敗しました: ${
          error instanceof Error ? error.message : String(error)
        }`,
      ],
      source: 'error',
    };
  }
}

export function classifySubagentType(subagentType, policy) {
  const type = String(subagentType || '').trim();
  const readOnly = toTypeSet(policy.read_only_types);
  const writeCapable = toTypeSet(policy.write_capable_types);
  const shell = toTypeSet(policy.shell_types);

  if (readOnly.has(type)) return 'read_only';
  if (writeCapable.has(type)) return 'write_capable';
  if (shell.has(type)) return 'shell';
  return 'unknown';
}

/**
 * タスク文言から Hard Boundary っぽいパス言及を抽出する。
 * 厳密な AST ではなく、起動前の粗いガード。
 */
export function findHardBoundaryMentions(taskText, patterns) {
  const text = String(taskText || '');
  if (!text.trim()) return [];

  const hits = [];
  const candidates = new Set();

  for (const match of text.matchAll(/[`'"(\s]([A-Za-z0-9_./\u3040-\u30ff\u4e00-\u9faf-]+\.[A-Za-z0-9]+)[`'")\s,]/g)) {
    candidates.add(normalizeProjectPath(match[1]));
  }
  for (const match of text.matchAll(
    /(?:^|[\s`'"(])((?:api|supabase|docs\/architecture|\.cursor\/rules|\.github\/workflows)\/[A-Za-z0-9_./\u3040-\u30ff\u4e00-\u9faf-]*)/g,
  )) {
    candidates.add(normalizeProjectPath(match[1]));
  }
  for (const token of [
    'PROJECT_MEMORY.md',
    'vercel.json',
    'vite.config.ts',
    'vite.config.mts',
    'vite.config.js',
    'next.config.ts',
    'next.config.js',
    'tsconfig.json',
    'src/lib/supabase.ts',
    'src/lib/db.ts',
  ]) {
    if (text.includes(token)) candidates.add(token);
  }

  for (const candidate of candidates) {
    const hit = matchHardBoundary(candidate, patterns);
    if (hit.matched) {
      hits.push({ file: hit.file, label: hit.label });
    }
  }

  return hits;
}

function isWhitelistedForAllHits(hits, whitelist) {
  if (!Array.isArray(whitelist) || whitelist.length === 0) return false;

  return hits.every((hit) =>
    whitelist.some((entry) => {
      const normalized = normalizeProjectPath(entry);
      if (normalized.endsWith('/')) {
        return hit.file === normalized.slice(0, -1) || hit.file.startsWith(normalized);
      }
      return hit.file === normalized;
    }),
  );
}

/**
 * subagentStart 用の判定。
 * @returns {{ decision: 'allow' | 'deny', code: string, userMessage?: string, agentMessage?: string }}
 */
export function evaluateSubagentStart(input, options = {}) {
  const env = options.env || process.env;
  if (String(env.SUBAGENT_POLICY_ALLOW || '').trim().match(/^(1|true|yes)$/i)) {
    return { decision: 'allow', code: 'subagent-bypass' };
  }

  const policy = options.policy || loadSubagentPolicy(options.policyPath);
  if (policy.errors?.length) {
    return {
      decision: 'deny',
      code: 'policy-error',
      userMessage: `サブエージェント方針の読み込みに失敗: ${policy.errors.join(' / ')}`,
      agentMessage: policy.errors.join('\n'),
    };
  }

  const subagentType = String(input.subagent_type || input.subagentType || '').trim();
  const task = String(input.task || input.prompt || input.description || '');
  const className = classifySubagentType(subagentType, policy);

  if (className === 'unknown') {
    return {
      decision: 'deny',
      code: 'unknown-subagent-type',
      userMessage: `未登録のサブエージェント種別をブロックしました: ${subagentType || '(空)'}`,
      agentMessage: [
        'サブエージェント方針に無い種別です。',
        `- type: ${subagentType || '(空)'}`,
        `- 設定: ${SUBAGENT_POLICY_PATH}`,
        '',
        '調査だけなら explore を使ってください。実装が必要なら generalPurpose を使い、変更契約を先に承認してください。',
      ].join('\n'),
    };
  }

  const gate = options.gate || loadChangeContractGate(options.gatePath);
  if (gate.errors?.length) {
    return {
      decision: 'deny',
      code: 'gate-error',
      userMessage: `変更契約ゲート異常のためサブエージェント起動を停止: ${gate.errors.join(' / ')}`,
      agentMessage: gate.errors.join('\n'),
    };
  }

  if (
    gate.mode === GATE_MODES.pending &&
    policy.deny_write_types_when_contract_pending &&
    (className === 'write_capable' ||
      (className === 'shell' && !policy.allow_shell_when_contract_pending))
  ) {
    return {
      decision: 'deny',
      code: 'contract-pending-blocks-write-subagent',
      userMessage:
        '変更契約が pending のため、書き込み可能なサブエージェント起動をブロックしました。承認後に再実行してください。',
      agentMessage: [
        '変更契約ゲートが pending です。write 系サブエージェントは起動できません。',
        `- type: ${subagentType} (${className})`,
        `- reason: ${gate.reason || '(なし)'}`,
        '',
        '許可されるもの: explore / cursor-guide / ci-investigator（read-only）',
        '次の手順: ユーザー承認 → pnpm run contract:approve → 必要なら親エージェントで実装',
      ].join('\n'),
    };
  }

  if (
    className === 'write_capable' &&
    policy.deny_write_types_for_hard_boundary_task_without_approval
  ) {
    const boundaryConfig = options.boundaryConfigPath || DEFAULT_BOUNDARY_CONFIG_PATH;
    const { patterns, errors } = getProtectedPatterns(boundaryConfig);
    if (errors.length > 0) {
      return {
        decision: 'deny',
        code: 'boundary-config-error',
        userMessage: `Hard Boundary 設定エラー: ${errors.join(' / ')}`,
        agentMessage: errors.join('\n'),
      };
    }

    const mentions = findHardBoundaryMentions(task, patterns);
    if (mentions.length > 0) {
      const approved =
        gate.mode === GATE_MODES.approved && isWhitelistedForAllHits(mentions, gate.whitelist);

      if (!approved) {
        const mentionText = mentions.map((hit) => `${hit.label}: ${hit.file}`).join(', ');
        return {
          decision: 'deny',
          code: 'hard-boundary-task-without-approval',
          userMessage: `Hard Boundary に触れるタスクのため、write 系サブエージェントをブロックしました（${mentionText}）。`,
          agentMessage: [
            'タスク内容が Hard Boundary に触れていますが、変更契約の approved whitelist が不足しています。',
            `- type: ${subagentType}`,
            `- mentions: ${mentionText}`,
            `- gate.mode: ${gate.mode}`,
            `- whitelist: ${gate.whitelist.join(', ') || '(なし)'}`,
            '',
            '次の手順:',
            '1. 親エージェントで変更契約を提示する',
            '2. contract:pending → ユーザー承認 → contract:approve（対象パスを whitelist へ）',
            '3. 調査だけなら explore（read-only）を使う',
            '4. Hard Boundary 編集自体は親側 + session-allow で行う',
          ].join('\n'),
        };
      }
    }
  }

  return {
    decision: 'allow',
    code: `allow-${className}`,
  };
}

/**
 * subagentStop 用: Hard Boundary を変更していたら follow-up を返す。
 */
export function evaluateSubagentStop(input, options = {}) {
  const modifiedFiles = Array.isArray(input.modified_files)
    ? input.modified_files
    : Array.isArray(input.modifiedFiles)
      ? input.modifiedFiles
      : [];

  if (modifiedFiles.length === 0) {
    return { followup: null, hits: [] };
  }

  const boundaryConfig = options.boundaryConfigPath || DEFAULT_BOUNDARY_CONFIG_PATH;
  const { patterns } = getProtectedPatterns(boundaryConfig);
  const hits = [];

  for (const file of modifiedFiles) {
    const normalized = normalizeProjectPath(String(file));
    const hit = matchHardBoundary(normalized, patterns);
    if (hit.matched) hits.push(hit);
  }

  if (hits.length === 0) {
    return { followup: null, hits: [] };
  }

  const mentionText = hits.map((hit) => `${hit.label}: ${hit.file}`).join(', ');
  return {
    hits,
    followup: [
      '【停止】サブエージェントが Hard Boundary を変更した可能性があります。',
      `- type: ${input.subagent_type || input.subagentType || '(不明)'}`,
      `- 変更: ${mentionText}`,
      '',
      '自動続行せず、差分を確認し、変更契約・session-allow・ユーザー承認の有無を検証してください。',
      '不要な変更があれば直ちに戻してください。',
    ].join('\n'),
  };
}
