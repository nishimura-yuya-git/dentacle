#!/usr/bin/env node
/**
 * Claim Grounding 単体テスト。
 * 期待値根拠: 薄い知識Graph層（評価器の主張↔根拠照合）。宣言なしは skip。
 */
import {
  evaluateClaimGrounding,
  hasUnresolvedObserveProblems,
  isObserveBlockersCleared,
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
- 参照の正体: Nani!?（文書シェル）。対象は業務ハブ
- 対象枠: ロック（DashboardLayout）
- 借りてよい: 白い面の静けさ
- 借りない: 専用レール、max-w-4xl、導入文、Cursor Cloud 枠
- ページ枠照合:
  - 見本: なし（指示のみ）
  - 実装: \`/opt/cursor/artifacts/screenshots/home-full.png\`
  - 差分: 対象は業務ハブのためサイドバー・FABを残した。見本の文書シェル枠は移植していない
  - Read済み: はい
- 操作観察:
  - 対象: なし（端の開閉なし）
- AI処理観察:
  - 対象: なし（AI処理なし）
- 観察で残した阻害: なし
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
  // 期待値根拠: ユーザー報告 — 見本を Cursor Cloud と決めつけ、借り契約なしで完成にした
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
  - 実装: \`/tmp/full.png\`
  - 差分: 左レールあり
  - Read済み: はい
- Stop非該当の根拠: \`src/pages/Home.tsx\`
`,
    goal: 'ui-polish',
  });
  assertEqual(result.status, 'stop', '借り契約なしの UI Polish は stop');
  assertTrue(result.missing.includes('borrow-inventory'), 'borrow-inventory 欠落');
}

{
  const parsed = parseCompletionDeclaration(`
## 完成宣言（UI Polish Loop）
- 参照の正体: Nani!?
- 対象枠: ロック（DashboardLayout）
- 借りてよい: ピル型スライダー
- 借りない: 暗い面、3段階、詳細設定
`);
  assertEqual(parsed.hasBorrowContract, true, '借り契約を検出');
  assertEqual(parsed.referenceIdentity, 'Nani!?', '参照の正体');
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
  // 期待値根拠: ユーザー報告 — /security 左レール下端▼を開かず完成にした。静止スクショでは見切れを捕まえない。
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
- 参照の正体: Nani!?
- 対象枠: ロック（SecurityLayout）
- 借りてよい: 緑キャンバス、白い article
- 借りない: レール幅 298px、共有メニューの下開き
- ページ枠照合:
  - 見本: \`/tmp/nani-full.png\`
  - 実装: \`/tmp/full.png\`
  - 差分: 左レールは w-56。文書シェル枠は /security のみ
  - Read済み: はい
- Stop非該当の根拠: \`src/pages/Security/sections/SecurityRail.tsx\`
`,
    goal: 'ui-polish',
  });
  assertEqual(result.status, 'stop', '操作観察なしの UI Polish は stop');
  assertTrue(result.missing.includes('observe-edge'), 'observe-edge 欠落');
}

{
  const parsedSkip = parseCompletionDeclaration(`
## 完成宣言（UI Polish Loop）
- 操作観察:
  - 対象: なし（端の開閉なし）
`);
  assertEqual(parsedSkip.hasEdgeOverlayObserve, true, '端の開閉なしは操作観察を充足');
}

{
  const parsedOpen = parseCompletionDeclaration(`
## 完成宣言（UI Polish Loop）
- 操作観察:
  - 対象: アカウントメニュー（左レール下端▼）
  - 種別: screenshot
  - パス: \`/tmp/account-menu-open.png\`
  - Read済み: はい（上開き、ログアウト可視、レールは動かない）
`);
  assertEqual(parsedOpen.hasEdgeOverlayObserve, true, '端の開閉観察を検出');
  assertEqual(parsedOpen.edgeTarget, 'アカウントメニュー（左レール下端▼）', '操作観察の対象');
  assertTrue(parsedOpen.edgePaths.includes('/tmp/account-menu-open.png'), '操作観察パス');
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
  - パス: \`browser_snapshot:security\`
  - Read済み: はい（見出しとレール幅が一致）
- 参照の正体: Nani!?（文書シェル）
- 対象枠: ロック（SecurityLayout）
- 借りてよい: 緑キャンバス、白い article
- 借りない: レール幅 298px、共有メニューの下開き
- ページ枠照合:
  - 見本: なし（指示のみ）
  - 実装: \`/tmp/security-full.png\`
  - 差分: 左レールは w-56。本文は max-w-4xl
  - Read済み: はい
- 操作観察:
  - 対象: アカウントメニュー（左レール下端▼）
  - 種別: screenshot
  - パス: \`/tmp/account-menu-open.png\`
  - Read済み: はい（上開き、ログアウト可視、レールは動かない）
- AI処理観察:
  - 対象: なし（AI処理なし）
- 観察で残した阻害: なし
- Stop非該当の根拠: PROJECT_MEMORY.md §6.56 と差分 \`src/components/layout/AccountMenu.tsx\`
`,
    goal: 'ui-polish',
    changedFiles: ['src/components/layout/AccountMenu.tsx'],
  });
  assertEqual(result.status, 'pass', '操作観察ありの UI Polish は pass');
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

{
  // 期待値根拠: ご意見チャット観察 — 見出し二重・FAB衝突を書いて完成できた
  assertEqual(
    hasUnresolvedObserveProblems('見出しが二重で、FABが送信に重なる'),
    true,
    '未解消の二重・重なりを検出',
  );
  assertEqual(
    hasUnresolvedObserveProblems('見出し重複は解消。FAB衝突なし'),
    false,
    '解消済みは未解消ではない',
  );
  assertEqual(hasUnresolvedObserveProblems('余白は一致'), false, '阻害語が無い観察は未解消ではない');
  assertEqual(isObserveBlockersCleared('なし'), true, '阻害欄なしはクリア');
  assertEqual(isObserveBlockersCleared(''), false, '空欄はクリアではない');
  assertEqual(isObserveBlockersCleared('見出し重複が残る'), false, '残件ありはクリアではない');
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
  - Read済み: はい（見出しが二重で、FABが送信に重なる）
- 参照の正体: なし（指示のみ）
- 対象枠: ロック（DashboardLayout）
- 借りてよい: なし（指示のみ）
- 借りない: 見本のページ枠、暗い面
- ページ枠照合:
  - 見本: なし（指示のみ）
  - 実装: \`/tmp/feedback-full.png\`
  - 差分: 対象は業務ハブのためサイドバー・FABを残した
  - Read済み: はい
- 操作観察:
  - 対象: なし（端の開閉なし）
- 観察で残した阻害: なし
- Stop非該当の根拠: \`src/pages/Feedback.tsx\`
`,
    goal: 'ui-polish',
  });
  assertEqual(result.status, 'stop', '未解消の観察阻害を残した完成は stop');
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
  - Read済み: はい（余白は一致）
- 参照の正体: なし（指示のみ）
- 対象枠: ロック（DashboardLayout）
- 借りてよい: なし（指示のみ）
- 借りない: 見本のページ枠、暗い面
- ページ枠照合:
  - 見本: なし（指示のみ）
  - 実装: \`/tmp/feedback-full.png\`
  - 差分: 対象は業務ハブのためサイドバーを残した
  - Read済み: はい
- 操作観察:
  - 対象: なし（端の開閉なし）
- Stop非該当の根拠: \`src/pages/Feedback.tsx\`
`,
    goal: 'ui-polish',
  });
  assertEqual(result.status, 'stop', '観察阻害欄なしの UI Polish は stop');
  assertTrue(result.missing.includes('observe-blockers-cleared'), '阻害欄欠落');
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
- 参照の正体: なし（指示のみ）
- 対象枠: ロック（DashboardLayout）
- 借りてよい: なし（指示のみ）
- 借りない: 見本のページ枠、暗い面
- ページ枠照合:
  - 見本: なし（指示のみ）
  - 実装: \`/tmp/feedback-full.png\`
  - 差分: 対象は業務ハブのためサイドバーを残した
  - Read済み: はい
- 操作観察:
  - 対象: なし（端の開閉なし）
- AI処理観察:
  - 対象: なし（AI処理なし）
- 観察で残した阻害: なし
- Stop非該当の根拠: \`src/pages/Feedback.tsx\`
`,
    goal: 'ui-polish',
  });
  assertEqual(result.status, 'pass', '解消済みの観察阻害は pass');
}

{
  // 期待値根拠: ユーザー指示 — AI処理中は Thinking orbs の Composing を観察するまで完成にしない
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
- 参照の正体: Thinking orbs の Composing 部品
- 対象枠: ロック（DashboardLayout）
- 借りてよい: 点オーブ
- 借りない: 暗い面、英語ラベル
- ページ枠照合:
  - 見本: なし（指示のみ）
  - 実装: \`/tmp/full.png\`
  - 差分: 対象は業務ハブのためサイドバーを残した
  - Read済み: はい
- 操作観察:
  - 対象: なし（端の開閉なし）
- 観察で残した阻害: なし
- Stop非該当の根拠: \`src/pages/Calendar/CalendarPage.tsx\`
`,
    goal: 'ui-polish',
  });
  assertEqual(result.status, 'stop', 'AI処理観察なしの UI Polish は stop');
  assertTrue(result.missing.includes('observe-ai-processing'), 'observe-ai-processing 欠落');
}

{
  const parsedSkip = parseCompletionDeclaration(`
## 完成宣言（UI Polish Loop）
- AI処理観察:
  - 対象: なし（AI処理なし）
`);
  assertEqual(parsedSkip.hasAiProcessingObserve, true, 'AI処理なしは AI処理観察を充足');
}

{
  const parsedRun = parseCompletionDeclaration(`
## 完成宣言（UI Polish Loop）
- AI処理観察:
  - 対象: 実行中（カレンダー自動提案）
  - 種別: screenshot
  - パス: \`/tmp/auto-propose-composing.png\`
  - Read済み: はい（64px オーブと日本語。暗い面なし）
`);
  assertEqual(parsedRun.hasAiProcessingObserve, true, '実行中の AI処理観察を検出');
  assertEqual(parsedRun.aiTarget, '実行中（カレンダー自動提案）', 'AI処理観察の対象');
  assertTrue(parsedRun.aiPaths.includes('/tmp/auto-propose-composing.png'), 'AI処理観察パス');
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
  - パス: \`/tmp/full.png\`
  - Read済み: はい（ページ全体を確認）
- 参照の正体: Thinking orbs の Composing 部品
- 対象枠: ロック（DashboardLayout）
- 借りてよい: 点オーブ
- 借りない: 暗い面、英語ラベル
- ページ枠照合:
  - 見本: なし（指示のみ）
  - 実装: \`/tmp/full.png\`
  - 差分: 対象は業務ハブのためサイドバーを残した
  - Read済み: はい
- 操作観察:
  - 対象: なし（端の開閉なし）
- AI処理観察:
  - 対象: なし（AI処理なし）
- 観察で残した阻害: なし
- Stop非該当の根拠: \`src/components/ui/ComposingOrb.tsx\`
`,
    goal: 'ui-polish',
    changedFiles: ['src/components/ui/ComposingOrb.tsx'],
  });
  assertEqual(result.status, 'stop', 'ComposingOrb 差分で AI処理なしは stop');
  assertTrue(result.missing.includes('observe-ai-processing'), '実行中観察が必要');
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
  - パス: \`/tmp/full.png\`
  - Read済み: はい（ページ全体を確認）
- 参照の正体: Thinking orbs の Composing 部品
- 対象枠: ロック（DashboardLayout）
- 借りてよい: 点オーブ
- 借りない: 暗い面、英語ラベル
- ページ枠照合:
  - 見本: なし（指示のみ）
  - 実装: \`/tmp/full.png\`
  - 差分: 対象は業務ハブのためサイドバーを残した
  - Read済み: はい
- 操作観察:
  - 対象: なし（端の開閉なし）
- AI処理観察:
  - 対象: 実行中（カレンダー自動提案）
  - 種別: screenshot
  - パス: \`/tmp/auto-propose-composing.png\`
  - Read済み: はい（64px オーブと日本語。暗い面なし）
- 観察で残した阻害: なし
- Stop非該当の根拠: \`src/components/ui/ComposingOrb.tsx\`
`,
    goal: 'ui-polish',
    changedFiles: ['src/components/ui/ComposingOrb.tsx'],
  });
  assertEqual(result.status, 'pass', '実行中の AI処理観察ありは pass');
}

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}

console.log('\nAll claim-grounding tests passed');
