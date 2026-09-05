#!/usr/bin/env node
/**
 * コピー先ハーネスを雛形へ戻す CLI。
 *
 *   pnpm run harness:up
 *   pnpm run harness:up -- --status
 *   pnpm run harness:up -- --set-path "/path/to/template"
 *   pnpm run harness:up -- --apply
 *   pnpm run harness:up -- --apply --files a b
 *   pnpm run harness:up -- --dismiss
 */
import {
  DEFAULT_TEMPLATE_PATH,
  TEMPLATE_UPSTREAM_CANDIDATES_PATH,
  TEMPLATE_UPSTREAM_CONFIG_PATH,
  applyTemplateUpstream,
  dismissTemplateUpstreamCandidates,
  formatTemplateUpstreamForContext,
  isHarnessUpstreamFile,
  listChangedFiles,
  loadTemplateUpstreamCandidates,
  resolveLiveTemplateUpstream,
  saveTemplateUpstreamPath,
  writeTemplateUpstreamCandidates,
  writeTemplateUpstreamCandidatesFromWorkspace,
} from './lib/template-upstream-policy.mjs';

const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const statusMode = args.includes('--status');
const applyMode = args.includes('--apply');
const dismissMode = args.includes('--dismiss');
const setPathIdx = args.indexOf('--set-path');
const filesIdx = args.indexOf('--files');

function readFlag(name) {
  const index = args.indexOf(`--${name}`);
  if (index >= 0) {
    const next = args[index + 1];
    if (next && !next.startsWith('--')) return next;
    return '';
  }
  const inline = args.find((arg) => arg.startsWith(`--${name}=`));
  return inline ? inline.slice(`--${name}=`.length) : '';
}

function collectFiles() {
  if (filesIdx < 0) return null;
  return args.slice(filesIdx + 1).filter((arg) => !arg.startsWith('--'));
}

function print(report) {
  if (jsonMode) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  const identity = report.identity || {};
  console.log('[harness:up] 雛形ハーネス還元');
  console.log(`role: ${identity.role || 'unset'}`);
  console.log(`雛形: ${identity.templatePath || '(未設定)'}`);
  if (report.message) console.log(report.message);
  const files = report.files || report.copied || [];
  if (files.length > 0) {
    console.log(`対象: ${files.length} 件`);
    for (const file of files) {
      console.log(`- ${typeof file === 'string' ? file : file.file}`);
    }
  }
  if (report.skipped?.length) {
    console.log('スキップ:');
    for (const item of report.skipped) {
      console.log(`- ${item.file}: ${item.reason}`);
    }
  }
}

if (setPathIdx >= 0) {
  const requested = readFlag('set-path') || DEFAULT_TEMPLATE_PATH;
  const saved = saveTemplateUpstreamPath(
    requested,
    process.env.TEMPLATE_UPSTREAM_CONFIG_PATH || TEMPLATE_UPSTREAM_CONFIG_PATH,
  );
  print({
    identity: resolveLiveTemplateUpstream({ templatePath: saved }),
    message: `雛形パスを保存しました: ${saved}`,
    files: [],
  });
  process.exit(0);
}

if (dismissMode) {
  const report = dismissTemplateUpstreamCandidates(
    process.env.TEMPLATE_UPSTREAM_CANDIDATES_PATH || TEMPLATE_UPSTREAM_CANDIDATES_PATH,
  );
  print({
    identity: resolveLiveTemplateUpstream(),
    message: '候補を破棄しました。',
    files: report.files || [],
  });
  process.exit(0);
}

const identity = resolveLiveTemplateUpstream();
const scanned = writeTemplateUpstreamCandidatesFromWorkspace({ identity });
const report = scanned.report || loadTemplateUpstreamCandidates();
const changed = listChangedFiles().filter(isHarnessUpstreamFile);
const files = collectFiles() || (changed.length > 0 ? changed : report.files || []);

if (applyMode) {
  const result = applyTemplateUpstream({ files, identity });
  if (result.ok) {
    writeTemplateUpstreamCandidates(
      {
        generatedAt: new Date().toISOString(),
        status: 'applied',
        files: result.copied,
        pendingCount: 0,
        templatePath: result.templatePath,
        appliedAt: new Date().toISOString(),
      },
      process.env.TEMPLATE_UPSTREAM_CANDIDATES_PATH || TEMPLATE_UPSTREAM_CANDIDATES_PATH,
    );
  }
  print({
    identity,
    message: result.ok ? '雛形へ戻しました。commit は雛形側で行ってください。' : result.reason,
    files: result.copied || [],
    skipped: result.skipped,
  });
  process.exit(result.ok ? 0 : 1);
}

const pending = report.status === 'pending' ? report.files || [] : files;
print({
  identity,
  message:
    identity.role === 'template'
      ? '今いる場所は雛形本人です。還元はコピー先から /harness-up します。'
      : identity.role === 'unset'
        ? `パス未設定です。pnpm run harness:up -- --set-path "${DEFAULT_TEMPLATE_PATH}"`
        : pending.length > 0
          ? '戻す場合は /harness-up のあと pnpm run harness:up -- --apply'
          : '戻すハーネス差分はありません。',
  files: pending,
});

if (!jsonMode && identity.canRemind && pending.length > 0) {
  console.log('');
  console.log(formatTemplateUpstreamForContext(identity, { ...report, files: pending, status: 'pending', pendingCount: pending.length }));
}

if (statusMode && identity.canRemind && pending.length > 0) {
  process.exit(1);
}
