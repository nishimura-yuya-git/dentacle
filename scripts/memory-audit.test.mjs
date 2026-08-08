#!/usr/bin/env node
/**
 * Memory Tighten（要詰め監査）単体テスト。
 * 期待値根拠: 打ち合わせ議事録を PROJECT_MEMORY に入れたあと、
 * プレースホルダ・空節・根拠リンク不足を機械検出し、自動編集はしない方針。
 */
import {
  auditProjectMemory,
  formatAuditForContext,
  PLACEHOLDER_RE,
} from './lib/memory-audit.mjs';

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
  const md = `# 記憶

## 2. Hard Boundaries

### 2.1 業務コア

| 領域 | ファイル | 影響 |
|---|---|---|
| \`[業務コアA]\` | \`[src/pages/...]\` | \`[例: 売上不一致]\` |

## 3. SSoT

| 領域 | SSoT | 役割 |
|---|---|---|
| \`[売上/金額]\` | \`[関数名・ファイル名]\` | \`[計算内容]\` |

## 11. 参照

- [safety.mdc](./.cursor/rules/safety.mdc) — 破壊防止
`;

  const report = auditProjectMemory(md, { sourcePath: 'fixture.md' });
  assertTrue(report.summary.total >= 2, 'プレースホルダ節から finding が出る');
  assertTrue(report.summary.critical >= 1, 'Hard Boundary / SSoT は critical');
  assertTrue(
    report.findings.every((f) => f.nextAction && f.section),
    'finding に section と nextAction がある',
  );
  assertTrue(!report.findings.some((f) => f.title.includes('safety.mdc')), 'Markdownリンクはプレースホルダ扱いにしない');
}

{
  const md = `## 2. Hard Boundaries

### 2.2 ガード（2026-07-18 決定）

- Hard Boundary は PreToolUse で守る。
- 関連: \`scripts/cursor-safety-guard.mjs\`, \`docs/agent-loop-harness.md\`
`;
  const report = auditProjectMemory(md);
  assertEqual(report.summary.total, 0, '具体的な決定＋関連ファイルがあれば finding なし');
}

{
  const md = `## 10. 過去事例

| 日付 | 事象 | 原因 | 再発防止 |
|---|---|---|---|
| \`[YYYY-MM-DD]\` | \`[何が壊れたか]\` | \`[原因]\` | \`[ルール]\` |
`;
  const report = auditProjectMemory(md);
  assertTrue(report.summary.medium >= 1 || report.summary.total >= 1, 'テンプレだけの過去事例は要詰め');
}

{
  const md = `## 2. Hard Boundaries

- 売上計算は壊してはいけない。
`;
  const report = auditProjectMemory(md);
  const linkGap = report.findings.find((f) => f.id.startsWith('link-gap'));
  assertTrue(linkGap, '決定っぽい文に関連ファイルが無いと link-gap');
}

{
  assertTrue(PLACEHOLDER_RE.test('[業務コアA]'), '業務コアA はプレースホルダ');
  assertTrue(PLACEHOLDER_RE.test('[関数名・ファイル名]'), '関数名プレースホルダ');
  assertTrue(!PLACEHOLDER_RE.test('普通の文章'), '通常文は非マッチ');
}

{
  const report = auditProjectMemory(`## 3. SSoT\n\n- [計算SSoTファイル] — [何の計算根拠か]\n`);
  const text = formatAuditForContext(report);
  assertTrue(text.includes('要詰め'), 'context 文言に要詰めがある');
  assertTrue(text.includes('自動編集しない'), '自動編集しない旨がある');
  assertTrue(text.includes('pnpm run memory:audit'), 'CLI 導線がある');
}

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}

console.log('\nAll memory-audit tests passed.');
