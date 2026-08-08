#!/usr/bin/env node
/**
 * PreToolUse ガードの単体テスト（Hard Boundary + 変更契約ゲート）。
 * 期待値の根拠: Phase A/B 変更契約、PROJECT_MEMORY §2.2、docs/agent-loop-harness.md
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const guardPath = join(scriptDir, 'cursor-safety-guard.mjs');

let failed = 0;

function runGuard(payload, env = {}) {
  const result = spawnSync(process.execPath, [guardPath], {
    cwd: projectRoot,
    encoding: 'utf8',
    input: JSON.stringify(payload),
    env: {
      ...process.env,
      ...env,
      HARD_BOUNDARY_ALLOW: Object.hasOwn(env, 'HARD_BOUNDARY_ALLOW')
        ? env.HARD_BOUNDARY_ALLOW
        : '',
      CHANGE_CONTRACT_GATE_ALLOW: Object.hasOwn(env, 'CHANGE_CONTRACT_GATE_ALLOW')
        ? env.CHANGE_CONTRACT_GATE_ALLOW
        : '',
    },
  });

  if (result.status !== 0) {
    throw new Error(`ガードが非ゼロ終了: ${result.status}\n${result.stderr}\n${result.stdout}`);
  }

  return JSON.parse(result.stdout || '{}');
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    failed += 1;
    console.error(`FAIL: ${message}`);
    console.error(`  expected: ${expected}`);
    console.error(`  actual:   ${actual}`);
    return;
  }
  console.log(`PASS: ${message}`);
}

const workspace = mkdtempSync(join(tmpdir(), 'hb-guard-'));

try {
  const openGate = join(workspace, 'gate-open.json');
  writeFileSync(openGate, JSON.stringify({ mode: 'open' }));

  {
    const out = runGuard(
      {
        tool_name: 'Write',
        cwd: projectRoot,
        tool_input: { path: join(projectRoot, 'src/pages/Home.tsx') },
      },
      { CHANGE_CONTRACT_GATE_PATH: openGate },
    );
    assertEqual(out.permission, 'allow', 'open 時: 通常ソース編集は allow');
  }

  {
    const out = runGuard(
      {
        tool_name: 'Write',
        cwd: projectRoot,
        tool_input: { path: join(projectRoot, 'api/resend/emails.js') },
      },
      { CHANGE_CONTRACT_GATE_PATH: openGate },
    );
    assertEqual(out.permission, 'deny', 'open 時: api/ 編集は deny');
  }

  {
    const out = runGuard(
      {
        tool_name: 'StrReplace',
        cwd: projectRoot,
        tool_input: { path: join(projectRoot, 'PROJECT_MEMORY.md') },
      },
      { CHANGE_CONTRACT_GATE_PATH: openGate },
    );
    assertEqual(out.permission, 'deny', 'open 時: PROJECT_MEMORY.md 編集は deny');
  }

  {
    const out = runGuard(
      {
        tool_name: 'Write',
        cwd: projectRoot,
        tool_input: { path: join(projectRoot, 'vercel.json') },
      },
      { CHANGE_CONTRACT_GATE_PATH: openGate, HARD_BOUNDARY_ALLOW: '1' },
    );
    assertEqual(out.permission, 'allow', 'HARD_BOUNDARY_ALLOW=1 で HB bypass');
  }

  {
    const allowFile = join(workspace, 'session-allow.json');
    writeFileSync(
      allowFile,
      JSON.stringify({
        reason: 'テスト用承認',
        paths: ['vercel.json'],
      }),
    );
    const out = runGuard(
      {
        tool_name: 'Write',
        cwd: projectRoot,
        tool_input: { path: join(projectRoot, 'vercel.json') },
      },
      {
        CHANGE_CONTRACT_GATE_PATH: openGate,
        HARD_BOUNDARY_SESSION_ALLOW: allowFile,
      },
    );
    assertEqual(out.permission, 'allow', 'session-allow の paths で HB bypass');
  }

  {
    const out = runGuard(
      {
        tool_name: 'EditNotebook',
        cwd: projectRoot,
        tool_input: {
          target_notebook: join(projectRoot, 'docs/architecture/業務フロー.mmd'),
        },
      },
      { CHANGE_CONTRACT_GATE_PATH: openGate },
    );
    assertEqual(out.permission, 'deny', 'docs/architecture は deny');
  }

  // --- Phase B ---
  const pendingGate = join(workspace, 'gate-pending.json');
  writeFileSync(
    pendingGate,
    JSON.stringify({
      mode: 'pending',
      reason: '変更契約提示中',
      proposed_whitelist: ['src/pages/Home.tsx'],
    }),
  );

  {
    const out = runGuard(
      {
        tool_name: 'Write',
        cwd: projectRoot,
        tool_input: { path: join(projectRoot, 'src/pages/Home.tsx') },
      },
      { CHANGE_CONTRACT_GATE_PATH: pendingGate },
    );
    assertEqual(out.permission, 'deny', 'pending 時: 通常ソースも deny');
  }

  {
    const out = runGuard(
      {
        tool_name: 'Write',
        cwd: projectRoot,
        tool_input: { path: join(projectRoot, 'src/pages/Home.tsx') },
      },
      {
        CHANGE_CONTRACT_GATE_PATH: pendingGate,
        HARD_BOUNDARY_ALLOW: '1',
      },
    );
    assertEqual(out.permission, 'deny', 'pending 時: HARD_BOUNDARY_ALLOW でも deny');
  }

  {
    const out = runGuard(
      {
        tool_name: 'Write',
        cwd: projectRoot,
        tool_input: { path: join(projectRoot, 'src/pages/Home.tsx') },
      },
      {
        CHANGE_CONTRACT_GATE_PATH: pendingGate,
        CHANGE_CONTRACT_GATE_ALLOW: '1',
      },
    );
    assertEqual(out.permission, 'allow', 'CHANGE_CONTRACT_GATE_ALLOW=1 で契約ゲート bypass');
  }

  const approvedGate = join(workspace, 'gate-approved.json');
  writeFileSync(
    approvedGate,
    JSON.stringify({
      mode: 'approved',
      reason: 'ユーザー承認: 進めて',
      whitelist: ['src/pages/Home.tsx', 'scripts/'],
    }),
  );

  {
    const out = runGuard(
      {
        tool_name: 'Write',
        cwd: projectRoot,
        tool_input: { path: join(projectRoot, 'src/pages/Home.tsx') },
      },
      { CHANGE_CONTRACT_GATE_PATH: approvedGate },
    );
    assertEqual(out.permission, 'allow', 'approved 時: whitelist 内は allow');
  }

  {
    const out = runGuard(
      {
        tool_name: 'Write',
        cwd: projectRoot,
        tool_input: { path: join(projectRoot, 'src/pages/Other.tsx') },
      },
      { CHANGE_CONTRACT_GATE_PATH: approvedGate },
    );
    assertEqual(out.permission, 'deny', 'approved 時: whitelist 外は deny');
  }

  {
    const out = runGuard(
      {
        tool_name: 'Write',
        cwd: projectRoot,
        tool_input: { path: join(projectRoot, 'scripts/cursor-safety-guard.mjs') },
      },
      { CHANGE_CONTRACT_GATE_PATH: approvedGate },
    );
    assertEqual(out.permission, 'allow', 'approved 時: prefix whitelist は allow');
  }

  {
    const out = runGuard(
      {
        tool_name: 'Write',
        cwd: projectRoot,
        tool_input: { path: join(projectRoot, '.cursor/change-contract-gate.json') },
      },
      { CHANGE_CONTRACT_GATE_PATH: openGate },
    );
    assertEqual(out.permission, 'deny', 'ゲートファイル自体への Write は deny');
  }

  {
    const hbInsideWhitelist = join(workspace, 'gate-approved-hb.json');
    writeFileSync(
      hbInsideWhitelist,
      JSON.stringify({
        mode: 'approved',
        reason: 'ユーザー承認: 進めて',
        whitelist: ['api/x.js'],
      }),
    );
    const out = runGuard(
      {
        tool_name: 'Write',
        cwd: projectRoot,
        tool_input: { path: join(projectRoot, 'api/x.js') },
      },
      { CHANGE_CONTRACT_GATE_PATH: hbInsideWhitelist },
    );
    assertEqual(out.permission, 'deny', 'approved+whitelist 内でも Hard Boundary は別層で deny');
  }

  if (failed > 0) {
    console.error(`\n${failed} 件失敗`);
    process.exit(1);
  }

  console.log('\n全ケース成功');
} finally {
  rmSync(workspace, { recursive: true, force: true });
}
