/**
 * セキュリティ検査を1本化するランナー（hook / CLI 共用）。
 * - test:security-scan
 * - security:scan（working-tree）
 * - security:scan（--diff）
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';

export const SECURITY_HOOK_DISABLE_ENV = 'SECURITY_HOOK_DISABLE';
export const SECURITY_HOOK_SKIP_DIFF_ENV = 'SECURITY_HOOK_SKIP_DIFF';
export const SECURITY_HOOK_DIFF_BASE_ENV = 'SECURITY_HOOK_DIFF_BASE';

/**
 * @param {NodeJS.ProcessEnv} [env]
 */
export function isSecurityHookDisabled(env = process.env) {
  return String(env[SECURITY_HOOK_DISABLE_ENV] || '').match(/^(1|true|yes)$/i);
}

/**
 * @param {object} options
 * @param {(command: string, args: string[], env?: NodeJS.ProcessEnv) => { status: number, stdout: string, stderr: string }} [options.runCommand]
 * @param {(args: string[]) => string} [options.tryGit]
 * @param {NodeJS.ProcessEnv} [options.env]
 * @param {string} [options.repoRoot]
 */
export function runSecurityHookBundle(options = {}) {
  const env = options.env ?? process.env;
  const repoRoot = options.repoRoot ?? process.cwd();
  const runCommand =
    options.runCommand ??
    ((command, args, commandEnv = env) => {
      const result = spawnSync(command, args, {
        encoding: 'utf8',
        cwd: repoRoot,
        env: commandEnv,
        shell: false,
      });
      return {
        status: result.status ?? 1,
        stdout: result.stdout ?? '',
        stderr: result.stderr ?? '',
      };
    });
  const tryGit =
    options.tryGit ??
    ((args) => {
      const result = spawnSync('git', args, {
        encoding: 'utf8',
        cwd: repoRoot,
        shell: false,
      });
      if (result.status !== 0) return '';
      return (result.stdout ?? '').trim();
    });

  if (isSecurityHookDisabled(env)) {
    return {
      disabled: true,
      ok: true,
      steps: [],
      followup: null,
    };
  }

  /** @type {Array<object>} */
  const steps = [];

  const unit = runCommand(process.execPath, [path.join(repoRoot, 'scripts/security-scan.test.mjs')], env);
  steps.push({
    name: 'test:security-scan',
    ok: unit.status === 0,
    status: unit.status,
    detail: summarizeOutput(unit),
  });

  const insideGit = Boolean(tryGit(['rev-parse', '--is-inside-work-tree']));
  if (!insideGit) {
    // 雛形コピー直後など .git が無い場合は scan 系を skip（完成差し戻しを防ぐ）
    steps.push({
      name: 'security:scan (working-tree)',
      ok: true,
      status: 0,
      skipped: true,
      detail: 'Git 未初期化のためスキップ',
    });
    steps.push({
      name: 'security:scan (diff)',
      ok: true,
      status: 0,
      skipped: true,
      detail: 'Git 未初期化のためスキップ',
    });
  } else {
    const workingTree = runCommand(
      process.execPath,
      [
        path.join(repoRoot, 'scripts/security-scan.mjs'),
        '--working-tree',
        '--fail-on-severity',
        env.SECURITY_FAIL_ON_SEVERITY || 'high',
        '--output',
        path.join(repoRoot, 'state', 'security-findings.json'),
      ],
      env,
    );
    steps.push({
      name: 'security:scan (working-tree)',
      ok: workingTree.status === 0,
      status: workingTree.status,
      detail: summarizeOutput(workingTree),
    });

    const skipDiff = String(env[SECURITY_HOOK_SKIP_DIFF_ENV] || '').match(/^(1|true|yes)$/i);
    if (!skipDiff) {
      const diffBase = resolveDiffBase(env, tryGit);
      if (!diffBase) {
        steps.push({
          name: 'security:scan (diff)',
          ok: true,
          status: 0,
          skipped: true,
          detail: 'diff base（origin/main 等）が無いためスキップ',
        });
      } else {
        const diffScan = runCommand(
          process.execPath,
          [
            path.join(repoRoot, 'scripts/security-scan.mjs'),
            '--diff',
            diffBase,
            '--fail-on-severity',
            env.SECURITY_FAIL_ON_SEVERITY || 'high',
            '--output',
            path.join(repoRoot, 'state', 'security-findings-diff.json'),
          ],
          env,
        );
        steps.push({
          name: `security:scan (diff ${diffBase})`,
          ok: diffScan.status === 0,
          status: diffScan.status,
          detail: summarizeOutput(diffScan),
        });
      }
    } else {
      steps.push({
        name: 'security:scan (diff)',
        ok: true,
        status: 0,
        skipped: true,
        detail: 'SECURITY_HOOK_SKIP_DIFF=1 のためスキップ',
      });
    }
  }

  const failed = steps.filter((step) => !step.ok);
  return {
    disabled: false,
    ok: failed.length === 0,
    steps,
    followup: failed.length === 0 ? null : formatFollowup(failed, steps),
  };
}

/**
 * @param {NodeJS.ProcessEnv} env
 * @param {(args: string[]) => string} tryGit
 */
export function resolveDiffBase(env, tryGit) {
  const configured = env[SECURITY_HOOK_DIFF_BASE_ENV];
  if (configured && tryGit(['rev-parse', '--verify', configured])) {
    return configured;
  }
  for (const candidate of ['origin/main', 'main', 'origin/master', 'master']) {
    if (tryGit(['rev-parse', '--verify', candidate])) {
      return candidate;
    }
  }
  return null;
}

function summarizeOutput(result) {
  const text = `${result.stdout}\n${result.stderr}`.trim();
  if (!text) return `exit ${result.status}`;
  return text.split('\n').slice(-8).join('\n');
}

function formatFollowup(failed, steps) {
  const lines = [
    'セキュリティ hook が失敗したため、完成報告を止めています。',
    '以下を修正してから再実行してください。',
    '',
    '失敗ステップ:',
    ...failed.map((step) => `- ${step.name} (exit ${step.status})`),
    '',
    '手動再実行:',
    '- pnpm run security:hook',
    '- pnpm run test:security-scan',
    '- pnpm run security:scan -- --working-tree',
    '- pnpm run security:scan -- --diff origin/main',
    '',
    '全ステップ概要:',
    ...steps.map(
      (step) =>
        `- ${step.ok ? 'OK' : 'NG'}${step.skipped ? '/skip' : ''}: ${step.name}`,
    ),
  ];
  return lines.join('\n');
}

/**
 * sessionStart 用の短文。
 * @param {object} lastReport
 */
export function formatSecurityHookContext(lastReport) {
  if (!lastReport || lastReport.ok || lastReport.disabled) return '';
  const failed = (lastReport.steps || []).filter((step) => !step.ok);
  if (failed.length === 0) return '';
  return [
    '## セキュリティ hook の未解消 finding',
    '前回 stop 時のセキュリティ検査が失敗したままです。完成前に解消してください。',
    ...failed.map((step) => `- ${step.name}`),
    '再実行: `pnpm run security:hook`',
  ].join('\n');
}
