#!/usr/bin/env node
/**
 * Cursor PreToolUse ガード。
 *
 * 判定順:
 * 1. 変更契約ゲート（pending / whitelist）
 * 2. Hard Boundary（保護対象パス）
 *
 * 一時解除:
 * - 変更契約: CHANGE_CONTRACT_GATE_ALLOW=1 / contract:approve
 * - Hard Boundary: HARD_BOUNDARY_ALLOW=1 / hard-boundary-session-allow.json
 */
import { readFileSync } from 'node:fs';
import { evaluateChangeContractGate } from './lib/change-contract-gate.mjs';
import {
  DEFAULT_BOUNDARY_CONFIG_PATH,
  SESSION_ALLOW_PATH,
  extractEditTargetPath,
  getProtectedPatterns,
  isEnvBypassEnabled,
  isSessionAllowed,
  loadSessionAllow,
  matchHardBoundary,
  toProjectRelativePath,
} from './lib/hard-boundary-policy.mjs';

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function resolveWorkspaceRoot(payload) {
  if (typeof payload.cwd === 'string' && payload.cwd.trim()) {
    return payload.cwd.trim();
  }

  if (Array.isArray(payload.workspace_roots) && payload.workspace_roots[0]) {
    return String(payload.workspace_roots[0]);
  }

  return process.cwd();
}

function allow() {
  process.stdout.write(JSON.stringify({ permission: 'allow' }));
}

function deny(userMessage, agentMessage) {
  process.stdout.write(
    JSON.stringify({
      permission: 'deny',
      user_message: userMessage,
      agent_message: agentMessage,
    }),
  );
}

function main() {
  const raw = readStdin();
  if (!raw.trim()) {
    allow();
    return;
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    deny(
      '安全ガード: フック入力の JSON 解析に失敗しました。',
      'cursor-safety-guard: stdin JSON が不正です。編集を中止し、hooks 設定を確認してください。',
    );
    return;
  }

  const toolInput = payload.tool_input ?? payload.toolInput ?? {};
  const targetPath = extractEditTargetPath(toolInput);
  if (!targetPath) {
    allow();
    return;
  }

  const workspaceRoot = resolveWorkspaceRoot(payload);
  const relativePath = toProjectRelativePath(targetPath, workspaceRoot);
  if (!relativePath) {
    allow();
    return;
  }

  const gatePath = process.env.CHANGE_CONTRACT_GATE_PATH;
  const contractDecision = evaluateChangeContractGate(relativePath, {
    env: process.env,
    gatePath: gatePath || undefined,
  });

  if (contractDecision.decision === 'deny') {
    deny(contractDecision.userMessage, contractDecision.agentMessage);
    return;
  }

  // Hard Boundary バイパスは契約ゲートを越えない
  if (isEnvBypassEnabled()) {
    allow();
    return;
  }

  const configPath = process.env.HARD_BOUNDARY_CONFIG || DEFAULT_BOUNDARY_CONFIG_PATH;
  const { patterns, errors } = getProtectedPatterns(configPath);

  if (errors.length > 0) {
    deny(
      `Hard Boundary 設定エラー: ${errors.join(' / ')}`,
      `Hard Boundary 設定が不正です。編集を中止し、${configPath} を修正してください。\n- ${errors.join('\n- ')}`,
    );
    return;
  }

  const hit = matchHardBoundary(relativePath, patterns);
  if (!hit.matched) {
    allow();
    return;
  }

  const sessionAllow = loadSessionAllow(
    process.env.HARD_BOUNDARY_SESSION_ALLOW || SESSION_ALLOW_PATH,
  );

  if (sessionAllow.errors.length > 0) {
    deny(
      `Hard Boundary 一時許可ファイルのエラー: ${sessionAllow.errors.join(' / ')}`,
      `一時許可ファイルが不正です。編集を中止してください。\n- ${sessionAllow.errors.join('\n- ')}`,
    );
    return;
  }

  if (isSessionAllowed(relativePath, sessionAllow)) {
    allow();
    return;
  }

  const userMessage = `Hard Boundary 保護: ${hit.label}（${hit.file}）への編集をブロックしました。変更契約とユーザー承認後、.cursor/hard-boundary-session-allow.json か HARD_BOUNDARY_ALLOW=1 で一時解除してください。`;
  const agentMessage = [
    'Hard Boundary PreToolUse ガードにより編集が拒否されました。',
    `- 対象: ${hit.file}`,
    `- 分類: ${hit.label}`,
    '',
    '次に行うこと:',
    '1. 変更契約（触る/触らない/Evidence Map）をチャットに出す',
    '2. ユーザーの明示承認を待つ',
    '3. 承認後のみ一時解除する',
    `   - ${SESSION_ALLOW_PATH} に paths/prefixes を書く（例は .cursor/hard-boundary-session-allow.example.json）`,
    '   - または環境変数 HARD_BOUNDARY_ALLOW=1',
    '4. 作業後は一時許可を必ず削除/無効化する',
    '',
    '承認前に保護対象を編集し続けないでください。',
  ].join('\n');

  deny(userMessage, agentMessage);
}

main();
