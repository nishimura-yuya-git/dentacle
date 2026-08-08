#!/usr/bin/env node
/**
 * Claim Grounding 単体テスト。
 * 期待値根拠: 薄い知識Graph層（評価器の主張↔根拠照合）。宣言なしは skip。
 */
import {
  evaluateClaimGrounding,
  parseCompletionDeclaration,
  resolveEvidencePaths,
} from './lib/claim-grounding.mjs';

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

function assertTrue(value, message) {
  assertEqual(Boolean(value), true, message);
}

{
  const parsed = parseCompletionDeclaration(`
## 完成宣言（Bug Fix Loop）
- Evaluation:
  - コマンド: pnpm run loop:evaluate
  - 結果: pass
- Stop非該当の根拠: Hard Boundary に未接触。\`scripts/loop-evaluator.mjs\` を確認。
`);
  assertEqual(parsed.hasEvaluationCommand, true, 'コマンドを検出');
  assertEqual(parsed.evaluationResult, 'pass', '結果 pass を検出');
  assertEqual(parsed.hasEvidenceLink, true, '根拠リンクあり');
  assertTrue(parsed.evidencePaths.includes('scripts/loop-evaluator.mjs'), 'パスを抽出');
}

{
  const result = evaluateClaimGrounding({
    declarationPath: 'state/does-not-exist-declaration.md',
  });
  assertEqual(result.status, 'skip', '宣言なしは skip');
}

{
  const result = evaluateClaimGrounding({
    declarationText: `
## 完成宣言（Bug Fix Loop）
- 直しました
`,
  });
  assertEqual(result.status, 'stop', 'Evaluation 欠落は stop');
  assertTrue(result.missing.includes('evaluation-command') || result.missing.includes('evaluation-result'), '欠落理由がある');
}

{
  const result = evaluateClaimGrounding({
    declarationText: `
## 完成宣言（UI Polish Loop）
- Evaluation:
  - コマンド: pnpm run loop:ui
  - 結果: warn
- Regression Guard: warn
`,
  });
  assertEqual(result.status, 'warn', '根拠リンク不足は warn');
}

{
  const result = evaluateClaimGrounding({
    declarationText: `
## 完成宣言（Bug Fix Loop）
- iteration: 1 / 3
- Evaluation:
  - コマンド: pnpm run loop:evaluator
  - 結果: pass
- Regression Guard: pass
- Stop非該当の根拠: PROJECT_MEMORY.md §2.9 と差分 \`scripts/lib/claim-grounding.mjs\` を確認済み
`,
    changedFiles: ['scripts/lib/claim-grounding.mjs'],
  });
  assertEqual(result.status, 'pass', '十分な根拠なら pass');
}

{
  const resolved = resolveEvidencePaths(['scripts/lib/claim-grounding.mjs', 'no/such/file.ts'], {
    changedFiles: ['scripts/lib/claim-grounding.mjs'],
  });
  assertEqual(resolved[0].ok, true, '変更面のパスは ok');
  assertEqual(resolved[1].ok, false, '存在しないパスは ng');
}

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}

console.log('\nAll claim-grounding tests passed');
