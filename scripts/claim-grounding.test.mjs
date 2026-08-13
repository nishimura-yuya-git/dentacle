#!/usr/bin/env node
/**
 * Claim Grounding 単体テスト。
 * 期待値根拠: 薄い知識Graph層（評価器の主張↔根拠照合）。宣言なしは skip。
 */
import {
  evaluateClaimGrounding,
  hasUnresolvedObserveProblems,
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
## 完成宣言（Bug Fix Loop）
- Evaluation:
  - コマンド: pnpm run loop:bugfix
  - 結果: warn
- Regression Guard: warn
`,
  });
  assertEqual(result.status, 'warn', '非UIで根拠リンク不足は warn');
}

{
  // 期待値根拠: desktop-harness Observe Loop — UI完成はキャプチャ未読で通さない
  const result = evaluateClaimGrounding({
    declarationText: `
## 完成宣言（UI Polish Loop）
- Evaluation:
  - コマンド: pnpm run loop:ui
  - 結果: pass
- Regression Guard: pass
- Stop非該当の根拠: Hard Boundary 未接触。\`src/pages/X.tsx\`
`,
    goal: 'ui-polish',
  });
  assertEqual(result.status, 'stop', 'UI Polish で観察証拠なしは stop');
  assertTrue(result.missing.includes('observe-evidence'), 'observe-evidence 欠落');
}

{
  const parsed = parseCompletionDeclaration(`
## 完成宣言（UI Polish Loop）
- Evaluation:
  - コマンド: pnpm run loop:ui
  - 結果: pass
- 観察証拠:
  - 種別: screenshot
  - パス: \`/opt/cursor/artifacts/screenshots/ui-polish.png\`
  - Read済み: はい（主ボタン余白が不足、面階層は一致）
- 観察で残した阻害: なし
- Stop非該当の根拠: \`src/pages/X.tsx\`
`);
  assertEqual(parsed.hasObserveEvidence, true, '観察証拠を検出');
  assertEqual(parsed.hasObserveBlockersCleared, true, '観察阻害なしを検出');
  assertEqual(parsed.observeKind, 'screenshot', '種別 screenshot');
  assertTrue(
    parsed.observePaths.includes('/opt/cursor/artifacts/screenshots/ui-polish.png'),
    '観察パスを抽出',
  );
}

{
  const result = evaluateClaimGrounding({
    declarationText: `
## 完成宣言（UI Polish Loop）
- iteration: 1 / 3
- Evaluation:
  - コマンド: pnpm run loop:evaluator
  - 結果: pass
- Regression Guard: pass
- Interface Review: quick / Approve
- 観察証拠:
  - 種別: snapshot
  - パス: \`browser_snapshot:home\`
  - Read済み: はい（見出しと CTA の階層が一致）
- 観察で残した阻害: なし
- Stop非該当の根拠: PROJECT_MEMORY.md §2.9 と差分 \`src/pages/Home.tsx\`
`,
    goal: 'ui-polish',
    changedFiles: ['src/pages/Home.tsx'],
  });
  assertEqual(result.status, 'pass', '観察証拠ありの UI Polish は pass');
}

{
  // 期待値根拠: ご意見チャット観察で見出し二重・FAB衝突を書いて完成にした失敗
  const result = evaluateClaimGrounding({
    declarationText: `
## 完成宣言（UI Polish Loop）
- Evaluation:
  - コマンド: pnpm run loop:ui
  - 結果: pass
- Regression Guard: pass
- 観察証拠:
  - 種別: screenshot
  - パス: \`/tmp/feedback.png\`
  - Read済み: はい（見出しが二重で、FABが送信に重なる）
- 観察で残した阻害: なし
- Stop非該当の根拠: \`src/pages/Feedback/FeedbackPage.tsx\`
`,
    goal: 'ui-polish',
  });
  assertEqual(result.status, 'stop', '観察に未解消の重複・衝突を残した完成は stop');
  assertTrue(result.missing.includes('observe-blockers-cleared'), 'observe-blockers-cleared 欠落');
}

{
  const result = evaluateClaimGrounding({
    declarationText: `
## 完成宣言（UI Polish Loop）
- Evaluation:
  - コマンド: pnpm run loop:ui
  - 結果: pass
- Regression Guard: pass
- 観察証拠:
  - 種別: screenshot
  - パス: \`/tmp/feedback.png\`
  - Read済み: はい（見出し重複は解消。FAB衝突なし）
- 観察で残した阻害: なし
- Stop非該当の根拠: \`src/pages/Feedback/FeedbackPage.tsx\`
`,
    goal: 'ui-polish',
  });
  assertEqual(result.status, 'pass', '阻害を解消した観察は pass');
}

{
  assertEqual(hasUnresolvedObserveProblems('見出しが二重で、FABが送信に重なる'), true, '未解消の重複・重なり');
  assertEqual(hasUnresolvedObserveProblems('見出し重複は解消。FAB衝突なし'), false, '解消済みは未解消ではない');
  assertEqual(hasUnresolvedObserveProblems('FAB衝突なし'), false, '衝突なしは解消表現');
  assertEqual(hasUnresolvedObserveProblems('余白は一致、ボタン階層を確認'), false, '阻害語なし');
}

{
  const result = evaluateClaimGrounding({
    declarationText: `
## 完成宣言（UI Polish Loop）
- Evaluation:
  - コマンド: pnpm run loop:ui
  - 結果: pass
- Regression Guard: pass
- 観察証拠:
  - 種別: screenshot
  - パス: \`/tmp/ui.png\`
  - Read済み: はい（余白は一致、ボタン階層を確認）
- Stop非該当の根拠: \`src/pages/X.tsx\`
`,
    goal: 'ui-polish',
  });
  assertEqual(result.status, 'stop', '観察阻害欄なしは stop');
  assertTrue(result.missing.includes('observe-blockers-cleared'), '観察阻害欄欠落');
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
