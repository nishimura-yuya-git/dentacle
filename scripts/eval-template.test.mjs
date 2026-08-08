#!/usr/bin/env node
/**
 * Eval Template 単体テスト。
 * 期待値根拠: loops/evals/README.md / loops/goals/bug-fix.md 完成条件
 */
import { parseCompletionDeclaration } from './lib/claim-grounding.mjs';
import {
  buildScoreContext,
  listEvalTemplates,
  loadEvalTemplate,
  resolveTemplatePathForGoal,
  scoreEvalTemplate,
  scoreGoalDeclaration,
} from './lib/eval-template.mjs';

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
  const templates = listEvalTemplates('loops/evals');
  assertTrue(templates.length >= 4, 'Eval template が4件以上ある');
}

{
  const path = resolveTemplatePathForGoal('bug-fix');
  assertEqual(path, 'loops/evals/bug-fix.completion.json', 'bug-fix の template を解決');
  const template = loadEvalTemplate(path);
  assertEqual(template.id, 'bug-fix.completion', 'template id');
}

{
  const declaration = `
## 完成宣言（Bug Fix Loop）
- iteration: 1 / 3
- Evaluation:
  - コマンド: pnpm run loop:evaluator
  - 結果: pass
- Stop非該当の根拠: Hard Boundary 未接触。\`scripts/loop-evaluator.mjs\`
`;
  const parsed = parseCompletionDeclaration(declaration);
  const result = scoreGoalDeclaration({
    goal: 'bug-fix',
    declarationText: declaration,
    parsed,
    evaluationResult: 'pass',
    verdictStatus: 'pass',
  });
  assertEqual(result.status, 'pass', '充足した完成宣言は pass');
  assertEqual(result.missingRequired.length, 0, '必須欠落なし');
}

{
  const declaration = `
## 完成宣言
- 直しました
`;
  const parsed = parseCompletionDeclaration(declaration);
  const result = scoreGoalDeclaration({
    goal: 'bug-fix',
    declarationText: declaration,
    parsed,
    verdictStatus: 'pass',
  });
  assertEqual(result.status, 'stop', 'Evaluation 欠落は stop');
  assertTrue(result.missingRequired.includes('evaluation-run'), 'evaluation-run が欠落');
}

{
  const template = loadEvalTemplate('loops/evals/ui-polish.completion.json');
  const signals = buildScoreContext({
    declarationText: 'Evaluation: コマンド: pnpm run loop:ui\n結果: pass\n根拠: `src/pages/X.tsx`',
    parsed: parseCompletionDeclaration(
      'Evaluation:\n  - コマンド: pnpm run loop:ui\n  - 結果: pass\n根拠: `src/pages/X.tsx`',
    ),
    evaluationResult: 'pass',
    verdictStatus: 'pass',
  });
  const scored = scoreEvalTemplate(template, signals);
  assertEqual(scored.status, 'warn', 'Interface Review 未記載は warn（任意）');
}

{
  const result = scoreGoalDeclaration({ goal: 'unknown-goal' });
  assertEqual(result.status, 'skip', '未知 goal は skip');
}

if (failed > 0) {
  console.error(`\n${failed}件失敗`);
  process.exit(1);
}
console.log('\n全件成功');
