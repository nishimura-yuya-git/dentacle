#!/usr/bin/env node
/**
 * No progress 検知の単体テスト。
 * 期待値根拠: loops/goals/bug-fix.md「同じ失敗が 2 回続く」、Loop Engineering の No progress ブレーキ。
 */
import {
  appendProgressAttempt,
  buildFailureSignature,
  detectNoProgress,
  isFailureLike,
} from './lib/loop-progress.mjs';

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
  assertEqual(isFailureLike('stop'), true, 'stop は failureLike');
  assertEqual(isFailureLike('warn'), true, 'warn は failureLike');
  assertEqual(isFailureLike('pass'), false, 'pass は failureLike ではない');
}

{
  const a = buildFailureSignature({
    evaluationDecision: { status: 'stop', reason: 'Hard Boundary' },
    discoveryFindings: [{ severity: 'stop', type: 'hard-boundary', title: 'API の変更を検知' }],
    verdictStatus: 'stop',
  });
  const b = buildFailureSignature({
    evaluationDecision: { status: 'stop', reason: 'Hard Boundary' },
    discoveryFindings: [{ severity: 'stop', type: 'hard-boundary', title: 'API の変更を検知' }],
    verdictStatus: 'stop',
  });
  const c = buildFailureSignature({
    evaluationDecision: { status: 'pass', reason: 'ok' },
    discoveryFindings: [],
    verdictStatus: 'pass',
  });
  assertEqual(a, b, '同じ失敗は同じシグネチャ');
  assertTrue(a !== c, '成功とはシグネチャが異なる');
}

{
  const attempts = [
    { signature: 'aaa', failureLike: true, status: 'stop' },
    { signature: 'aaa', failureLike: true, status: 'stop' },
  ];
  const detection = detectNoProgress(attempts, { sameFailureLimit: 2 });
  assertEqual(detection.noProgress, true, '同じ stop が2回で No progress');
  assertEqual(detection.severity, 'stop', 'stop 連続は severity=stop');
}

{
  const attempts = [
    { signature: 'www', failureLike: true, status: 'warn' },
    { signature: 'www', failureLike: true, status: 'warn' },
  ];
  const detection = detectNoProgress(attempts, { sameFailureLimit: 2 });
  assertEqual(detection.noProgress, true, '同じ warn が2回で No progress 警告');
  assertEqual(detection.severity, 'warn', 'warn 連続は severity=warn');
}

{
  const attempts = [
    { signature: 'aaa', failureLike: true, status: 'stop' },
    { signature: 'bbb', failureLike: true, status: 'stop' },
  ];
  const detection = detectNoProgress(attempts, { sameFailureLimit: 2 });
  assertEqual(detection.noProgress, false, 'シグネチャが変われば No progress ではない');
}

{
  const attempts = [
    { signature: 'aaa', failureLike: true, status: 'stop' },
    { signature: 'aaa', failureLike: false, status: 'pass' },
    { signature: 'aaa', failureLike: true, status: 'stop' },
  ];
  const detection = detectNoProgress(attempts, { sameFailureLimit: 2 });
  assertEqual(detection.noProgress, false, 'pass が挟まればストリークが切れる');
}

{
  let state = { version: 1, attempts: [] };
  state = appendProgressAttempt(state, { at: 't1', signature: 's', failureLike: true, status: 'stop' }, { historyLimit: 2 });
  state = appendProgressAttempt(state, { at: 't2', signature: 's', failureLike: true, status: 'stop' }, { historyLimit: 2 });
  state = appendProgressAttempt(state, { at: 't3', signature: 's', failureLike: true, status: 'stop' }, { historyLimit: 2 });
  assertEqual(state.attempts.length, 2, 'historyLimit で末尾だけ残す');
  assertEqual(state.attempts[0].at, 't2', '古い attempt は落ちる');
}

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}

console.log('\nAll loop-progress tests passed');
