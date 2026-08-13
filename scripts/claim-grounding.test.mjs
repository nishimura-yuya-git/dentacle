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
- Stop非該当の根拠: \`src/pages/X.tsx\`
`);
  assertEqual(parsed.hasObserveEvidence, true, '観察証拠を検出');
  assertEqual(parsed.hasChromeCompare, false, 'ページ枠照合が無い観察だけでは chrome 未充足');
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
- ページ枠照合:
  - 見本: なし（指示のみ）
  - 実装: \`/opt/cursor/artifacts/screenshots/home-full.png\`
  - 差分: 業務サイドバーとご意見FABは見本に無く、実装のページ全体からも外れている
  - Read済み: はい
- 骨格照合:
  - 見本URL: なし（指示のみ）
  - 借りる: 余白と見出し階層
  - 借りない: 外部ブランドの色とフォント
  - Read済み: はい
- Stop非該当の根拠: PROJECT_MEMORY.md §2.9 と差分 \`src/pages/Home.tsx\`
`,
    goal: 'ui-polish',
    changedFiles: ['src/pages/Home.tsx'],
  });
  assertEqual(result.status, 'pass', '観察証拠ありの UI Polish は pass');
}

{
  // 期待値根拠: ユーザー報告 — 内側パネルだけ寄せて完成扱いになった。ページ枠照合が無い観察は stop。
  const result = evaluateClaimGrounding({
    declarationText: `
## 完成宣言（UI Polish Loop）
- Evaluation:
  - コマンド: pnpm run loop:ui
  - 結果: pass
- Regression Guard: pass
- 観察証拠:
  - 種別: screenshot
  - パス: \`/tmp/inner-panel.png\`
  - Read済み: はい（白パネルの角丸と本文サイズは一致）
- Stop非該当の根拠: Hard Boundary 未接触。\`src/pages/Home.tsx\`
`,
    goal: 'ui-polish',
  });
  assertEqual(result.status, 'stop', '内側パネルだけの観察は stop');
  assertTrue(result.missing.includes('observe-chrome'), 'observe-chrome 欠落');
}

{
  const parsed = parseCompletionDeclaration(`
## 完成宣言（UI Polish Loop）
- Evaluation:
  - コマンド: pnpm run loop:ui
  - 結果: pass
- 観察証拠:
  - 種別: screenshot
  - パス: \`/tmp/inner-panel.png\`
  - Read済み: はい（白パネルは一致）
- ページ枠照合:
  - 見本: \`/tmp/reference-full.png\`
  - 実装: \`/tmp/impl-full.png\`
  - 差分: 左レールあり。業務サイドバー・FABは見本に無く実装から除外
  - Read済み: はい
- Stop非該当の根拠: \`src/pages/X.tsx\`
`);
  assertEqual(parsed.hasChromeCompare, true, 'ページ枠照合を検出');
  assertTrue(parsed.chromeImplementationPaths.includes('/tmp/impl-full.png'), '実装キャプチャパス');
  assertEqual(parsed.chromeReference, '/tmp/reference-full.png', '見本パス');
}

{
  const parsed = parseCompletionDeclaration(`
## 完成宣言（UI Polish Loop）
- Evaluation:
  - コマンド: pnpm run loop:ui
  - 結果: pass
- 観察証拠:
  - 種別: screenshot
  - パス: \`/tmp/inner-panel.png\`
  - Read済み: はい（白パネルは一致）
- ページ枠照合:
  - 見本: \`/tmp/reference-full.png\`
  - 実装: \`/tmp/impl-full.png\`
  - 差分: 左レールあり。業務サイドバー・FABは見本に無く実装から除外
  - Read済み: はい
- 骨格照合:
  - 見本URL: https://nani.now/ja/security
  - 借りる: 左レール幅、白パネル、h2下線、囲み、点線リンク、カード外フッター
  - 借りない: 氷青背景、Inter、3D PNG、OAuth、Stripe
  - Read済み: はい
- Stop非該当の根拠: \`src/pages/X.tsx\`
`);
  assertEqual(parsed.hasBorrowCopy, true, '骨格照合を検出');
  assertEqual(parsed.hasLiveReferenceUrl, true, 'ライブ見本URLを検出');
  assertEqual(parsed.hasReferenceCapture, true, '見本キャプチャパスがある');
  assertEqual(parsed.hasValidReferenceShot, true, 'ライブURLでもスクショがあれば充足');
}

{
  const result = evaluateClaimGrounding({
    declarationText: `
## 完成宣言（UI Polish Loop）
- Evaluation:
  - コマンド: pnpm run loop:ui
  - 結果: pass
- 観察証拠:
  - 種別: screenshot
  - パス: \`/tmp/full.png\`
  - Read済み: はい（ページ全体を確認）
- ページ枠照合:
  - 見本: なし（指示のみ）
  - 実装: \`/tmp/full.png\`
  - 差分: 未確認
  - Read済み: はい
- Stop非該当の根拠: \`src/pages/Home.tsx\`
`,
    goal: 'ui-polish',
  });
  assertEqual(result.status, 'stop', 'ページ枠の差分が未確認なら stop');
  assertTrue(result.missing.includes('observe-chrome'), '未確認差分は chrome 未充足');
}

{
  // 期待値根拠: ユーザー報告 — 骨格（枠）と事実（OAuth/Stripe）を分けずに寄せ得た。骨格照合が無い完成は stop。
  const result = evaluateClaimGrounding({
    declarationText: `
## 完成宣言（UI Polish Loop）
- Evaluation:
  - コマンド: pnpm run loop:ui
  - 結果: pass
- Regression Guard: pass
- 観察証拠:
  - 種別: screenshot
  - パス: \`/tmp/full.png\`
  - Read済み: はい（ページ全体を確認）
- ページ枠照合:
  - 見本: \`/tmp/reference-full.png\`
  - 実装: \`/tmp/impl-full.png\`
  - 差分: 左レールあり。業務サイドバーは見本に無く実装から除外
  - Read済み: はい
- Stop非該当の根拠: \`src/pages/Home.tsx\`
`,
    goal: 'ui-polish',
  });
  assertEqual(result.status, 'stop', '骨格照合が無い UI Polish は stop');
  assertTrue(result.missing.includes('observe-borrow'), 'observe-borrow 欠落');
}

{
  // 期待値根拠: ユーザー報告 — ライブURLを記憶だけで寄せて完成し得た。見本スクショ必須。
  const result = evaluateClaimGrounding({
    declarationText: `
## 完成宣言（UI Polish Loop）
- Evaluation:
  - コマンド: pnpm run loop:ui
  - 結果: pass
- Regression Guard: pass
- 観察証拠:
  - 種別: screenshot
  - パス: \`/tmp/impl-full.png\`
  - Read済み: はい（ページ全体を確認）
- ページ枠照合:
  - 見本: なし（指示のみ）
  - 実装: \`/tmp/impl-full.png\`
  - 差分: 左レールあり。業務サイドバーは無い
  - Read済み: はい
- 骨格照合:
  - 見本URL: https://nani.now/ja/security
  - 借りる: 左レール幅、白パネル、h2下線
  - 借りない: 氷青、Inter、OAuth、Stripe
  - Read済み: はい
- Stop非該当の根拠: \`src/pages/Home.tsx\`
`,
    goal: 'ui-polish',
  });
  assertEqual(result.status, 'stop', 'ライブURLなのに見本スクショなしは stop');
  assertTrue(result.missing.includes('observe-reference-shot'), 'observe-reference-shot 欠落');
}

{
  const parsed = parseCompletionDeclaration(`
## 完成宣言（UI Polish Loop）
- Evaluation:
  - コマンド: pnpm run loop:ui
  - 結果: pass
- 観察証拠:
  - 種別: screenshot
  - パス: \`/tmp/full.png\`
  - Read済み: はい（ページ全体）
- ページ枠照合:
  - 見本: https://nani.now/ja/security
  - 実装: \`/tmp/impl-full.png\`
  - 差分: 左レールあり
  - Read済み: はい
`);
  assertEqual(parsed.hasChromeCompare, false, '見本がURL文字列なら chrome 未充足');
  assertEqual(parsed.hasValidReferenceShot, false, 'URL文字列は見本スクショに数えない');
}

{
  // 期待値根拠: ライブURLはページ全体スクショを見本にすれば完成してよい
  const result = evaluateClaimGrounding({
    declarationText: `
## 完成宣言（UI Polish Loop）
- Evaluation:
  - コマンド: pnpm run loop:ui
  - 結果: pass
- Regression Guard: pass
- 観察証拠:
  - 種別: screenshot
  - パス: \`/tmp/impl-full.png\`
  - Read済み: はい（左レールと白パネルのページ枠が一致）
- ページ枠照合:
  - 見本: \`/tmp/nani-security-live-full.png\`
  - 実装: \`/tmp/impl-full.png\`
  - 差分: 左レールあり。業務サイドバー・FABは見本に無く実装から除外
  - Read済み: はい
- 骨格照合:
  - 見本URL: https://nani.now/ja/security
  - 借りる: 左レール幅、白パネル、h2下線、囲み、点線リンク、カード外フッター
  - 借りない: 氷青、Inter、3D PNG、OAuth、Stripe
  - Read済み: はい
- Stop非該当の根拠: PROJECT_MEMORY.md §2.15 と差分 \`src/pages/Security/SecurityPage.tsx\`
`,
    goal: 'ui-polish',
    changedFiles: ['src/pages/Security/SecurityPage.tsx'],
  });
  assertEqual(result.status, 'pass', 'ライブURLでも見本スクショと骨格照合があれば pass');
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
