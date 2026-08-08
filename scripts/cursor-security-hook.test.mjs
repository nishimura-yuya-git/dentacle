import assert from 'node:assert/strict';
import {
  formatSecurityHookContext,
  isSecurityHookDisabled,
  resolveDiffBase,
  runSecurityHookBundle,
} from './lib/security-hook-runner.mjs';

function testDisabled() {
  assert.ok(isSecurityHookDisabled({ SECURITY_HOOK_DISABLE: '1' }));
  const report = runSecurityHookBundle({
    env: { SECURITY_HOOK_DISABLE: '1' },
    runCommand: () => {
      throw new Error('should not run');
    },
  });
  assert.equal(report.disabled, true);
  assert.equal(report.ok, true);
  assert.equal(report.followup, null);
}

function testBundleFailureFollowup() {
  let calls = 0;
  const report = runSecurityHookBundle({
    env: { SECURITY_HOOK_SKIP_DIFF: '1' },
    runCommand: () => {
      calls += 1;
      // 1本目 unit OK, 2本目 working-tree NG
      if (calls === 1) return { status: 0, stdout: 'ok', stderr: '' };
      return { status: 1, stdout: '', stderr: 'high findings' };
    },
    tryGit: (args) => (args.includes('--is-inside-work-tree') ? 'true' : ''),
  });
  assert.equal(report.ok, false);
  assert.ok(report.followup.includes('セキュリティ hook が失敗'));
  assert.ok(report.followup.includes('security:scan (working-tree)'));
  assert.equal(report.followup.includes('SECURITY_HOOK_DISABLE'), false);
}

function testNonGitSkipsScans() {
  let calls = 0;
  const report = runSecurityHookBundle({
    env: {},
    runCommand: () => {
      calls += 1;
      // unit のみ実行される想定
      return { status: 0, stdout: 'ok', stderr: '' };
    },
    tryGit: () => '',
  });
  assert.equal(report.ok, true);
  assert.equal(report.followup, null);
  assert.equal(calls, 1, 'unit のみ実行されること');
  const skipped = report.steps.filter((step) => step.skipped);
  assert.equal(skipped.length, 2);
  assert.ok(skipped.every((step) => step.detail.includes('Git 未初期化')));
}

function testDiffBaseResolution() {
  const base = resolveDiffBase({ SECURITY_HOOK_DIFF_BASE: 'origin/main' }, (args) =>
    args.includes('origin/main') ? 'origin/main' : '',
  );
  assert.equal(base, 'origin/main');
  assert.equal(
    resolveDiffBase({}, () => ''),
    null,
  );
}

function testSessionContext() {
  const empty = formatSecurityHookContext({ ok: true, steps: [] });
  assert.equal(empty, '');
  const text = formatSecurityHookContext({
    ok: false,
    steps: [{ name: 'security:scan (working-tree)', ok: false }],
  });
  assert.ok(text.includes('未解消'));
  assert.ok(text.includes('security:scan (working-tree)'));
}

function main() {
  testDisabled();
  testBundleFailureFollowup();
  testNonGitSkipsScans();
  testDiffBaseResolution();
  testSessionContext();
  console.log('cursor-security-hook.test.mjs: OK');
}

main();
