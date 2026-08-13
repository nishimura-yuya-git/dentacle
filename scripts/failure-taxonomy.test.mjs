#!/usr/bin/env node
/**
 * Failure taxonomy 単体テスト。
 * 期待値根拠: docs/agent-loop-harness.md §23
 */
import {
  classifyEvaluatorReport,
  classifyFinding,
  classifyText,
  matchSimulationExpectation,
} from './lib/failure-taxonomy.mjs';

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

assertEqual(classifyText('Hard Boundary を検知しました'), 'hard-boundary', 'HB 文言');
assertEqual(classifyText('変更契約が pending のまま編集'), 'contract-gate', '契約文言');
assertEqual(classifyText('SSoT再実装の疑い'), 'ssot-debt', 'SSoT 文言');
assertEqual(classifyText('同じ失敗シグネチャが 2 回連続'), 'no-progress', 'No progress 文言');
assertEqual(classifyText('ページ枠照合がありません observe-chrome'), 'claim-grounding', 'ページ枠欠落は claim-grounding');

{
  const finding = classifyFinding({
    type: 'hard-boundary',
    title: '保護対象を変更',
    severity: 'stop',
  });
  assertEqual(finding.id, 'hard-boundary', 'finding type から分類');
}

{
  const taxonomy = classifyEvaluatorReport({
    verdict: { status: 'stop', reason: '完成宣言の Evaluation 欠落' },
    claimGrounding: { status: 'stop', reason: 'Evaluation 欠落は stop' },
    discovery: { findings: [] },
    progress: { detection: { noProgress: false } },
  });
  assertEqual(taxonomy.primary, 'claim-grounding', 'primary は claim-grounding');
  assertTrue(taxonomy.classes.some((item) => item.id === 'claim-grounding'), 'classes に含まれる');
}

{
  const matched = matchSimulationExpectation({
    expectedPermission: 'deny',
    actualPermission: 'deny',
    expectedFailureClass: 'contract-gate',
    denyReason: '変更契約ゲートが pending のため編集を拒否しました',
  });
  assertTrue(matched.ok, 'シミュレーション期待と一致');
}

{
  const matched = matchSimulationExpectation({
    expectedPermission: 'deny',
    actualPermission: 'allow',
    expectedFailureClass: 'hard-boundary',
    denyReason: '',
  });
  assertEqual(matched.ok, false, '許可されてしまったら不一致');
}

if (failed > 0) {
  console.error(`\n${failed}件失敗`);
  process.exit(1);
}
console.log('\n全件成功');
