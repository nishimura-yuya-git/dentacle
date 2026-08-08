#!/usr/bin/env node
/**
 * Phase D/E 単体テスト。
 * 期待値根拠: memory-learning（MEMORY自動編集禁止）、loops/README shadow-branch 方針
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildMemoryCandidates,
  formatCandidatesForContext,
  writeMemoryCandidates,
  loadMemoryCandidates,
  dismissMemoryCandidate,
} from './lib/memory-candidates.mjs';
import { evaluateIsolationNeed } from './lib/isolation-policy.mjs';

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

const workspace = mkdtempSync(join(tmpdir(), 'memory-isolation-'));

try {
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

  {
    const report = buildMemoryCandidates({
      files: ['src/pages/Home.tsx'],
      gate: openGate,
      previous: { candidates: [] },
    });
    assertEqual(report.pendingCount, 0, '通常差分だけでは MEMORY 候補なし');
  }

  {
    const report = buildMemoryCandidates({
      files: ['api/resend/emails.js', 'scripts/cursor-safety-guard.mjs'],
      gate: {
        ...openGate,
        mode: 'approved',
        reason: 'ユーザー承認',
        whitelist: ['api/resend/emails.js'],
        source: 'file',
      },
      previous: { candidates: [] },
    });
    assertEqual(report.pendingCount >= 2, true, 'HB + ハーネス + 契約で候補が立つ');
    const context = formatCandidatesForContext(report);
    assertEqual(context.includes('/project-memory-learn'), true, 'context に learn 導線がある');
    assertEqual(context.includes('自動編集しない'), true, 'MEMORY 自動編集しない旨がある');
  }

  {
    const outPath = join(workspace, 'candidates.json');
    const report = buildMemoryCandidates({
      files: ['PROJECT_MEMORY.md'],
      gate: openGate,
      previous: { candidates: [] },
      outputPath: outPath,
    });
    writeMemoryCandidates(report, outPath);
    const loaded = loadMemoryCandidates(outPath);
    assertEqual(loaded.pendingCount > 0, true, '候補を保存・再読込できる');
    const dismissed = dismissMemoryCandidate('hb-diff', outPath);
    assertEqual(
      dismissed.candidates.find((item) => item.id === 'hb-diff')?.status,
      'dismissed',
      '候補を dismiss できる',
    );
  }

  {
    const evaluation = evaluateIsolationNeed({
      files: ['src/pages/Home.tsx'],
      gate: openGate,
      name: 'demo',
    });
    assertEqual(evaluation.level, 'none', '通常差分は隔離不要');
  }

  {
    const evaluation = evaluateIsolationNeed({
      files: ['api/x.js'],
      gate: openGate,
      name: 'hb-fix',
    });
    assertEqual(evaluation.level, 'required', 'HB 差分は隔離 required');
    assertEqual(evaluation.suggestedBranch.startsWith('shadow/'), true, 'shadow ブランチ名を提案');
    assertEqual(evaluation.suggestedWorktreePath.includes('.worktrees/'), true, 'worktree パスを提案');
  }

  {
    const evaluation = evaluateIsolationNeed({
      files: ['src/pages/Home.tsx'],
      gate: {
        ...openGate,
        mode: 'pending',
        reason: '提示中',
        source: 'file',
      },
    });
    assertEqual(evaluation.level, 'recommend', 'pending は隔離 recommend');
  }

  if (failed > 0) {
    console.error(`\n${failed} 件失敗`);
    process.exit(1);
  }
  console.log('\n全ケース成功');
} finally {
  rmSync(workspace, { recursive: true, force: true });
}
