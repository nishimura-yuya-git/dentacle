#!/usr/bin/env node
/**
 * 期待値の根拠: コピー先のハーネス強化は /harness-up だけが雛形へ戻す。
 * hook は察知とリマインドだけ。パス未設定・雛形本人では黙る。
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_TEMPLATE_PATH,
  applyTemplateUpstream,
  formatTemplateUpstreamForContext,
  isHarnessUpstreamFile,
  resolveTemplateIdentity,
  saveTemplateUpstreamPath,
  shouldRemindTemplateUpstream,
} from './lib/template-upstream-policy.mjs';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const sessionStartPath = fileURLToPath(new URL('./cursor-session-start-memory.mjs', import.meta.url));
const workspace = mkdtempSync(join(tmpdir(), 'harness-up-'));
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
  if (!value) {
    failed += 1;
    console.error(`FAIL: ${message}`);
    return;
  }
  console.log(`PASS: ${message}`);
}

function runNode(script, { input = '', env = {} } = {}) {
  return spawnSync(process.execPath, [script], {
    cwd: projectRoot,
    encoding: 'utf8',
    input,
    env: { ...process.env, ...env },
  });
}

function seedTemplate(dir) {
  for (const marker of ['.cursor/hooks.json', 'docs/agent-loop-harness.md', 'scripts/lib/.keep']) {
    const path = join(dir, marker);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, '{}\n', 'utf8');
  }
}

assertEqual(isHarnessUpstreamFile('.cursor/commands/harness-up.md'), true, 'commands は戻してよい');
assertEqual(isHarnessUpstreamFile('.cursor/rules/safety.mdc'), true, 'rules は戻してよい');
assertEqual(isHarnessUpstreamFile('scripts/lib/template-upstream-policy.mjs'), true, 'ハーネス SSoT は戻してよい');
assertEqual(isHarnessUpstreamFile('docs/agent-loop-harness.md'), true, 'ハーネス文書は戻してよい');
assertEqual(isHarnessUpstreamFile('PROJECT_MEMORY.md'), false, 'MEMORY は戻さない');
assertEqual(isHarnessUpstreamFile('顧客/x.md'), false, '顧客資料は戻さない');
assertEqual(isHarnessUpstreamFile('.cursor/hard-boundaries.json'), false, '案件 HB は戻さない');
assertEqual(isHarnessUpstreamFile('.cursor/template-upstream.json'), false, 'パス設定は戻さない');
assertEqual(isHarnessUpstreamFile('../secret.md'), false, '親ディレクトリは戻さない');

{
  const unset = resolveTemplateIdentity({ cwd: workspace, templatePath: null });
  assertEqual(unset.canRemind, false, 'パス未設定ではリマインドしない');
  assertEqual(unset.role, 'unset', 'パス未設定は unset');
  const self = resolveTemplateIdentity({ cwd: workspace, templatePath: workspace });
  assertEqual(self.isSelf, true, '同じ実体は雛形本人');
  assertEqual(self.canRemind, false, '雛形本人ではリマインドしない');
  const templateDir = join(workspace, 'template');
  const copyDir = join(workspace, 'copy');
  mkdirSync(templateDir);
  mkdirSync(copyDir);
  seedTemplate(templateDir);
  const copy = resolveTemplateIdentity({ cwd: copyDir, templatePath: templateDir });
  assertEqual(copy.role, 'copy', '別ディレクトリはコピー先');
  assertEqual(copy.canRemind, true, 'コピー先かつ雛形があるときだけ察知する');
}

{
  const identity = { canRemind: true, templatePath: DEFAULT_TEMPLATE_PATH };
  const report = { status: 'pending', pendingCount: 1, files: ['.cursor/commands/harness-up.md'] };
  assertEqual(shouldRemindTemplateUpstream(identity, report), true, 'コピー先の未反映はリマインドする');
  const text = formatTemplateUpstreamForContext(identity, report);
  assertTrue(text.includes('/harness-up'), 'リマインドに /harness-up を出す');
  assertTrue(text.includes('雛形へは自動で書きません'), '自動書き込みしない旨を出す');
}

{
  const fromRoot = join(workspace, 'apply-from');
  const toRoot = join(workspace, 'apply-to');
  seedTemplate(toRoot);
  mkdirSync(join(fromRoot, '.cursor/commands'), { recursive: true });
  writeFileSync(join(fromRoot, '.cursor/commands/harness-up.md'), '# from\n', 'utf8');
  writeFileSync(join(fromRoot, 'PROJECT_MEMORY.md'), 'secret\n', 'utf8');
  assertEqual(
    applyTemplateUpstream({
      files: ['.cursor/commands/harness-up.md'],
      fromRoot,
      identity: { templatePath: null, isSelf: false },
    }).ok,
    false,
    'パス未設定では apply しない',
  );
  assertEqual(
    applyTemplateUpstream({
      files: ['.cursor/commands/harness-up.md'],
      fromRoot,
      identity: { templatePath: fromRoot, isSelf: true },
    }).ok,
    false,
    '雛形本人では apply しない',
  );
  const result = applyTemplateUpstream({
    files: ['.cursor/commands/harness-up.md', 'PROJECT_MEMORY.md'],
    fromRoot,
    identity: resolveTemplateIdentity({ cwd: fromRoot, templatePath: toRoot }),
  });
  assertEqual(result.ok, true, 'コピー先から雛形へ戻せる');
  assertEqual(result.copied.join(','), '.cursor/commands/harness-up.md', 'allowlist だけ戻す');
}

{
  const configPath = join(workspace, 'session-config.json');
  const candidatesPath = join(workspace, 'session-candidates.json');
  const templateDir = join(workspace, 'session-template');
  const copyDir = join(workspace, 'session-copy');
  mkdirSync(templateDir);
  mkdirSync(copyDir);
  seedTemplate(templateDir);
  saveTemplateUpstreamPath(templateDir, configPath);
  writeFileSync(
    candidatesPath,
    JSON.stringify({ status: 'pending', files: ['.cursor/rules/safety.mdc'], pendingCount: 1 }),
    'utf8',
  );
  const merged = runNode(sessionStartPath, {
    input: '{}',
    env: {
      TEMPLATE_UPSTREAM_CONFIG_PATH: configPath,
      TEMPLATE_UPSTREAM_CANDIDATES_PATH: candidatesPath,
      TEMPLATE_UPSTREAM_CWD: copyDir,
      MEMORY_CANDIDATES_DISABLE: '1',
    },
  });
  const context = JSON.parse(merged.stdout || '{}').additional_context || '';
  assertTrue(context.includes('/harness-up'), 'sessionStart に /harness-up を合流する');
  const quiet = runNode(sessionStartPath, {
    input: '{}',
    env: {
      TEMPLATE_UPSTREAM_CONFIG_PATH: configPath,
      TEMPLATE_UPSTREAM_CANDIDATES_PATH: candidatesPath,
      TEMPLATE_UPSTREAM_CWD: templateDir,
      MEMORY_CANDIDATES_DISABLE: '1',
    },
  });
  const quietContext = JSON.parse(quiet.stdout || '{}').additional_context || '';
  assertTrue(!quietContext.includes('/harness-up'), '雛形本人の sessionStart では出さない');
}

{
  const raw = JSON.parse(readFileSync(join(projectRoot, '.cursor/template-upstream.json'), 'utf8'));
  assertEqual(raw.templatePath, DEFAULT_TEMPLATE_PATH, '出荷時の雛形パスが保存されている');
}

if (failed > 0) {
  console.error(`\n${failed} 件失敗`);
  process.exit(1);
}
console.log('\ntemplate-upstream: 全件成功');
