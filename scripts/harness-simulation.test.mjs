#!/usr/bin/env node
/**
 * ハーネス敵対シミュレーション。
 * Future AGI Simulate の persona×scenario×score 思想のみを借りる。
 * 期待値根拠: loops/simulations/adversarial-scenarios.json / PROJECT_MEMORY §2.2–2.3
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { matchSimulationExpectation } from './lib/failure-taxonomy.mjs';

const scriptDir = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const guardPath = join(scriptDir, 'cursor-safety-guard.mjs');
const scenariosPath = join(projectRoot, 'loops/simulations/adversarial-scenarios.json');

let failed = 0;

function assertTrue(value, message) {
  if (!value) {
    failed += 1;
    console.error(`FAIL: ${message}`);
    return;
  }
  console.log(`PASS: ${message}`);
}

function runGuard(payload, env = {}) {
  const result = spawnSync(process.execPath, [guardPath], {
    cwd: projectRoot,
    encoding: 'utf8',
    input: JSON.stringify(payload),
    env: {
      ...process.env,
      ...env,
      HARD_BOUNDARY_ALLOW: '',
      CHANGE_CONTRACT_GATE_ALLOW: '',
    },
  });
  if (result.status !== 0) {
    throw new Error(`ガードが非ゼロ終了: ${result.status}\n${result.stderr}\n${result.stdout}`);
  }
  return JSON.parse(result.stdout || '{}');
}

function writeGate(workspace, scenario) {
  if (scenario.gateMode === 'pending') {
    const path = join(workspace, `${scenario.id}-pending.json`);
    writeFileSync(
      path,
      JSON.stringify({
        mode: 'pending',
        reason: 'シミュレーション: 変更契約提示中',
        proposed_whitelist: scenario.approvedWhitelist ?? ['src/pages/Home.tsx'],
      }),
    );
    return path;
  }

  if (scenario.gateMode === 'approved') {
    const path = join(workspace, `${scenario.id}-approved.json`);
    writeFileSync(
      path,
      JSON.stringify({
        mode: 'approved',
        reason: 'シミュレーション: 承認済み',
        whitelist: scenario.approvedWhitelist ?? ['src/pages/Home.tsx'],
      }),
    );
    return path;
  }

  const path = join(workspace, `${scenario.id}-open.json`);
  writeFileSync(path, JSON.stringify({ mode: 'open' }));
  return path;
}

const catalog = JSON.parse(readFileSync(scenariosPath, 'utf8'));
const workspace = mkdtempSync(join(tmpdir(), 'harness-sim-'));

try {
  assertTrue(Array.isArray(catalog.scenarios) && catalog.scenarios.length >= 3, 'シナリオが定義されている');

  for (const scenario of catalog.scenarios) {
    const gatePath = writeGate(workspace, scenario);
    const targetPath = join(projectRoot, scenario.action.path);
    const out = runGuard(
      {
        tool_name: scenario.action.tool_name,
        cwd: projectRoot,
        tool_input: { path: targetPath },
      },
      { CHANGE_CONTRACT_GATE_PATH: gatePath },
    );

    const reason = [out.permission, out.user_message, out.agent_message, JSON.stringify(out)]
      .filter(Boolean)
      .join('\n');

    const matched = matchSimulationExpectation({
      expectedPermission: scenario.expected.permission,
      actualPermission: out.permission,
      expectedFailureClass: scenario.expected.failureClass,
      denyReason: reason,
    });

    assertTrue(
      matched.ok,
      `${scenario.id}: permission=${out.permission}, class=${matched.classified} (persona=${scenario.persona})`,
    );
  }
} finally {
  rmSync(workspace, { recursive: true, force: true });
}

if (failed > 0) {
  console.error(`\n${failed}件失敗`);
  process.exit(1);
}
console.log('\n全件成功');
