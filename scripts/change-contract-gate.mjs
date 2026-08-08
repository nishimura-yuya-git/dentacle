#!/usr/bin/env node
/**
 * 変更契約ゲート CLI。
 *
 *   pnpm run contract:status
 *   pnpm run contract:pending -- --reason "変更契約提示" path1 path2
 *   pnpm run contract:approve -- --reason "ユーザー承認: 進めて"
 *   pnpm run contract:approve -- --reason "ユーザー承認: 進めて" path1 path2
 *   pnpm run contract:close
 */
import { mkdirSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  CHANGE_CONTRACT_GATE_PATH,
  GATE_MODES,
  loadChangeContractGate,
} from './lib/change-contract-gate.mjs';
import { normalizeProjectPath } from './lib/hard-boundary-policy.mjs';

function printHelp() {
  console.log(`変更契約ゲート CLI

使い方:
  node scripts/change-contract-gate.mjs status
  node scripts/change-contract-gate.mjs pending --reason "変更契約提示" path1 path2
  node scripts/change-contract-gate.mjs approve --reason "ユーザー承認: 進めて"
  node scripts/change-contract-gate.mjs approve --reason "ユーザー承認: 進めて" path1 path2
  node scripts/change-contract-gate.mjs close

  pnpm run contract:pending -- --reason "変更契約提示" path1 path2
  pnpm run contract:approve -- --reason "ユーザー承認: 進めて"

mode:
  open     … ゲートなし相当。Hard Boundary のみ（Phase A）
  pending  … 全編集ブロック。ユーザー承認待ち
  approved … whitelist 内のみ編集可（Hard Boundary は別途）
`);
}

function parseArgs(argv) {
  const args = [...argv];
  const command = args.shift() || 'help';
  let reason = '';
  let expiresAt = '';
  const paths = [];

  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    // pnpm 経由の区切り。フラグの前後どちらに来ても無視する
    if (token === '--') {
      continue;
    }
    if (token === '--reason') {
      reason = String(args[i + 1] || '');
      i += 1;
      continue;
    }
    if (token.startsWith('--reason=')) {
      reason = token.slice('--reason='.length);
      continue;
    }
    if (token === '--expires-at') {
      expiresAt = String(args[i + 1] || '');
      i += 1;
      continue;
    }
    if (token.startsWith('--expires-at=')) {
      expiresAt = token.slice('--expires-at='.length);
      continue;
    }
    if (token === '--help' || token === '-h') {
      return { command: 'help', reason, expiresAt, paths };
    }
    // 位置引数はパスとして受け付ける
    paths.push(normalizeProjectPath(token));
  }

  return {
    command,
    reason: reason.trim(),
    expiresAt: expiresAt.trim(),
    paths: [...new Set(paths.filter(Boolean))],
  };
}

function writeGate(payload) {
  mkdirSync(dirname(CHANGE_CONTRACT_GATE_PATH), { recursive: true });
  writeFileSync(`${CHANGE_CONTRACT_GATE_PATH}`, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function printStatus() {
  const gate = loadChangeContractGate();
  console.log('[contract-gate] status');
  console.log(`path: ${CHANGE_CONTRACT_GATE_PATH}`);
  console.log(`source: ${gate.source}`);
  console.log(`mode: ${gate.mode}`);
  console.log(`reason: ${gate.reason || '(なし)'}`);
  console.log(`whitelist: ${gate.whitelist.join(', ') || '(なし)'}`);
  console.log(`proposed_whitelist: ${gate.proposed_whitelist.join(', ') || '(なし)'}`);
  console.log(`expires_at: ${gate.expires_at || '(なし)'}`);
  console.log(`expired: ${gate.expired ? 'yes' : 'no'}`);
  if (gate.errors.length > 0) {
    console.log(`errors: ${gate.errors.join(' / ')}`);
    process.exitCode = 1;
  }
}

function runPending({ reason, paths, expiresAt }) {
  if (paths.length === 0) {
    console.error('pending には -- path1 path2 で提案 whitelist が必要です。');
    process.exit(1);
  }
  if (!reason) {
    console.error('pending には --reason が必要です。');
    process.exit(1);
  }

  writeGate({
    mode: GATE_MODES.pending,
    reason,
    proposed_whitelist: paths,
    whitelist: [],
    expires_at: expiresAt || null,
    updated_at: new Date().toISOString(),
  });

  console.log('[contract-gate] pending に設定しました。編集はブロックされます。');
  console.log(`reason: ${reason}`);
  console.log(`proposed_whitelist: ${paths.join(', ')}`);
  console.log('ユーザー承認後: pnpm run contract:approve -- --reason "ユーザー承認: 進めて"');
}

function runApprove({ reason, paths, expiresAt }) {
  const current = loadChangeContractGate();
  const whitelist =
    paths.length > 0
      ? paths
      : current.proposed_whitelist.length > 0
        ? current.proposed_whitelist
        : current.whitelist;

  if (whitelist.length === 0) {
    console.error('approve には whitelist が必要です。pending 時の proposed_whitelist か -- path を指定してください。');
    process.exit(1);
  }
  if (!reason) {
    console.error('approve には --reason（ユーザー承認の文言）が必要です。');
    process.exit(1);
  }

  writeGate({
    mode: GATE_MODES.approved,
    reason,
    whitelist,
    proposed_whitelist: [],
    expires_at: expiresAt || current.expires_at || null,
    updated_at: new Date().toISOString(),
    approved_at: new Date().toISOString(),
  });

  console.log('[contract-gate] approved に設定しました。whitelist 内のみ編集できます。');
  console.log(`reason: ${reason}`);
  console.log(`whitelist: ${whitelist.join(', ')}`);
  console.log('Hard Boundary 対象は別途 session-allow / HARD_BOUNDARY_ALLOW が必要です。');
  console.log('作業後: pnpm run contract:close');
}

function runClose() {
  if (existsSync(CHANGE_CONTRACT_GATE_PATH)) {
    unlinkSync(CHANGE_CONTRACT_GATE_PATH);
    console.log('[contract-gate] ゲートを閉じました（ファイル削除）。');
    return;
  }
  console.log('[contract-gate] ゲートファイルはありません（すでに open）。');
}

const parsed = parseArgs(process.argv.slice(2));

switch (parsed.command) {
  case 'status':
    printStatus();
    break;
  case 'pending':
    runPending(parsed);
    break;
  case 'approve':
    runApprove(parsed);
    break;
  case 'close':
    runClose();
    break;
  case 'help':
  default:
    printHelp();
    if (parsed.command !== 'help') {
      process.exitCode = 1;
    }
    break;
}
