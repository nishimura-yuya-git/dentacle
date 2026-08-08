#!/usr/bin/env node
/**
 * サブエージェント権限ポリシーの単体テスト（Phase C）。
 * 期待値の根拠: grok-build capability 分離の取り込み方針、PROJECT_MEMORY §2.2/2.3
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  evaluateSubagentStart,
  evaluateSubagentStop,
  findHardBoundaryMentions,
  loadSubagentPolicy,
} from './lib/subagent-policy.mjs';
import { DEFAULT_PROTECTED_PATTERNS } from './lib/hard-boundary-policy.mjs';

let failed = 0;

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

const workspace = mkdtempSync(join(tmpdir(), 'subagent-policy-'));
const policyPath = join(workspace, 'subagent-policy.json');
writeFileSync(
  policyPath,
  JSON.stringify({
    read_only_types: ['explore', 'cursor-guide', 'ci-investigator'],
    write_capable_types: ['generalPurpose', 'best-of-n-runner'],
    shell_types: ['shell'],
    deny_write_types_when_contract_pending: true,
    deny_write_types_for_hard_boundary_task_without_approval: true,
    allow_shell_when_contract_pending: true,
  }),
);

const openGate = {
  mode: 'open',
  reason: null,
  whitelist: [],
  proposed_whitelist: [],
  expires_at: null,
  expired: false,
  errors: [],
  source: 'missing',
};

const pendingGate = {
  ...openGate,
  mode: 'pending',
  reason: '変更契約提示中',
  proposed_whitelist: ['src/pages/Home.tsx'],
  source: 'file',
};

const approvedGate = {
  ...openGate,
  mode: 'approved',
  reason: 'ユーザー承認: 進めて',
  whitelist: ['api/resend/emails.js'],
  source: 'file',
};

try {
  const policy = loadSubagentPolicy(policyPath);
  assertEqual(policy.source, 'file', 'ポリシーファイルを読める');

  {
    const out = evaluateSubagentStart(
      { subagent_type: 'explore', task: 'api/ の実装を調査して' },
      { policy, gate: openGate },
    );
    assertEqual(out.decision, 'allow', 'explore は Hard Boundary 言及でも allow');
  }

  {
    const out = evaluateSubagentStart(
      { subagent_type: 'generalPurpose', task: 'src/pages/Home.tsx にボタンを追加' },
      { policy, gate: openGate },
    );
    assertEqual(out.decision, 'allow', 'open 時の通常 generalPurpose は allow');
  }

  {
    const out = evaluateSubagentStart(
      { subagent_type: 'generalPurpose', task: 'Home を修正' },
      { policy, gate: pendingGate },
    );
    assertEqual(out.decision, 'deny', 'pending 時の generalPurpose は deny');
  }

  {
    const out = evaluateSubagentStart(
      { subagent_type: 'explore', task: '調査のみ' },
      { policy, gate: pendingGate },
    );
    assertEqual(out.decision, 'allow', 'pending 時の explore は allow');
  }

  {
    const out = evaluateSubagentStart(
      {
        subagent_type: 'generalPurpose',
        task: 'api/resend/emails.js を修正して自動返信を直す',
      },
      { policy, gate: openGate },
    );
    assertEqual(out.decision, 'deny', 'HB 言及 + 未承認の write 系は deny');
  }

  {
    const out = evaluateSubagentStart(
      {
        subagent_type: 'generalPurpose',
        task: 'api/resend/emails.js を修正して自動返信を直す',
      },
      { policy, gate: approvedGate },
    );
    assertEqual(out.decision, 'allow', 'HB 言及 + approved whitelist 一致は allow');
  }

  {
    const out = evaluateSubagentStart(
      { subagent_type: 'mystery-agent', task: '何かする' },
      { policy, gate: openGate },
    );
    assertEqual(out.decision, 'deny', '未登録 type は deny');
  }

  {
    const out = evaluateSubagentStart(
      { subagent_type: 'generalPurpose', task: 'api/x.js を直す' },
      { policy, gate: pendingGate, env: { SUBAGENT_POLICY_ALLOW: '1' } },
    );
    assertEqual(out.decision, 'allow', 'SUBAGENT_POLICY_ALLOW=1 で bypass');
  }

  {
    const mentions = findHardBoundaryMentions(
      'PROJECT_MEMORY.md と docs/architecture/業務フロー.mmd を確認',
      DEFAULT_PROTECTED_PATTERNS,
    );
    assertEqual(mentions.length >= 2, true, 'HB パス言及を抽出できる');
  }

  {
    const out = evaluateSubagentStop({
      subagent_type: 'generalPurpose',
      modified_files: ['src/pages/Home.tsx'],
    });
    assertEqual(out.followup, null, '通常ファイル変更では follow-up なし');
  }

  {
    const out = evaluateSubagentStop({
      subagent_type: 'generalPurpose',
      modified_files: ['api/resend/emails.js', 'src/pages/Home.tsx'],
    });
    assertEqual(Boolean(out.followup), true, 'HB 変更時は follow-up あり');
  }

  if (failed > 0) {
    console.error(`\n${failed} 件失敗`);
    process.exit(1);
  }
  console.log('\n全ケース成功');
} finally {
  rmSync(workspace, { recursive: true, force: true });
}
