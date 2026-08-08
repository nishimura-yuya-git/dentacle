#!/usr/bin/env node
/**
 * Context Budget（Select / compress / drop）の単体テスト。
 * 期待値根拠: Context Engineering の unit of work = what stays in the window。
 */
import { compressSnippet, selectContextSources } from './lib/context-budget.mjs';

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
  const result = selectContextSources({ goal: 'main-doctor', changedFiles: [] });
  assertTrue(result.selected.some((s) => s.path === 'PROJECT_MEMORY.md'), 'MEMORY は must');
  assertTrue(result.selected.some((s) => s.path === 'loops/goals/main-doctor.md'), 'main-doctor goal 文書を選ぶ');
  assertTrue(
    result.dropped.some((d) => d.path === 'loops/goals/bug-fix.md'),
    '無関係な bug-fix は drop',
  );
  assertTrue(
    result.dropped.some((d) => d.path.includes('ui-design')),
    'UI ルールは main-doctor では drop',
  );
}

{
  const result = selectContextSources({
    goal: 'ui-polish',
    changedFiles: ['src/pages/Home/Home.tsx'],
  });
  assertTrue(result.selected.some((s) => s.path === 'loops/goals/ui-polish.md'), 'ui-polish goal を選ぶ');
  assertTrue(result.selected.some((s) => s.path === 'loops/graphs/ui-polish.mmd'), 'ui-polish graph を選ぶ');
  assertTrue(result.selected.some((s) => s.path === '.cursor/rules/ui-design.mdc'), 'UI 変更で ui-design を選ぶ');
  assertTrue(
    result.selected.some((s) => s.path === '.cursor/skills/better-interface/SKILL.md'),
    'ui-polish では better-interface を残す',
  );
  assertTrue(
    result.selected.some((s) => s.path === '.cursor/skills/better-ui/SKILL.md'),
    'UI 変更の ui-polish では better-ui を残す',
  );
  assertTrue(
    result.selected.some((s) => s.path === 'loops/goals/regression-guard.md'),
    'ui-polish では Regression Guard も残す',
  );
  assertTrue(
    result.selected.some((s) => s.path === 'loops/graphs/regression-guard.mmd'),
    'ui-polish では Regression Guard graph も残す',
  );
}

{
  const result = selectContextSources({
    goal: 'bug-fix',
    changedFiles: ['src/utils/calc.ts'],
    budget: { mustMaxLines: 60, compressMaxLines: 20, maxSelectedSources: 4 },
  });
  assertTrue(result.selected.length <= 4, 'maxSelectedSources を守る');
  assertTrue(result.dropped.some((d) => d.reason.includes('budget')), '超過分は budget drop');
}

{
  const text = Array.from({ length: 10 }, (_, i) => `line-${i}`).join('\n');
  const compressed = compressSnippet(text, 3);
  assertTrue(compressed.includes('line-0'), '先頭行は残る');
  assertTrue(compressed.includes('context budget'), 'compress 注記がある');
  assertTrue(!compressed.includes('line-9'), '末尾行は落ちる');
}

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}

console.log('\nAll context-budget tests passed');
