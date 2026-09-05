/**
 * コピー先のハーネス強化を雛形へ戻す SSoT。
 * hook は察知とリマインドだけ。雛形への書き込みは /harness-up だけ。
 */
import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { normalizeProjectPath } from './hard-boundary-policy.mjs';

export const TEMPLATE_UPSTREAM_CONFIG_PATH = '.cursor/template-upstream.json';
export const TEMPLATE_UPSTREAM_CANDIDATES_PATH = 'state/template-upstream-candidates.json';
export const DEFAULT_TEMPLATE_PATH =
  '/Users/yuya/JOB/仕事関係/workspace/取引先HP/雛形/hp_model_cursor';

export const HARNESS_UPSTREAM_PREFIXES = [
  '.cursor/rules/',
  '.cursor/commands/',
  '.cursor/skills/',
  'scripts/cursor-',
  'scripts/lib/',
  'scripts/loop-',
  'loops/',
  'src/templates/',
];

export const HARNESS_UPSTREAM_FILES = [
  '.cursor/hooks.json',
  '.cursor/subagent-policy.json',
  '.cursor/hard-boundary-session-allow.example.json',
  '.cursor/change-contract-gate.example.json',
  '.cursor/feedback-ask-allow.example.json',
  '.cursor/template-upstream.example.json',
  '.cursor/feedback/_template.md',
  '.cursor/feedback/README.md',
  '.cursor/feedback/use_pnpm.md',
  '.cursor/feedback/no_forbidden_icon_libs.md',
  'docs/agent-loop-harness.md',
  'scripts/doctor.mjs',
  'scripts/harness-promote.mjs',
  'scripts/check-ui-harness.mjs',
  'scripts/check-hard-boundaries.mjs',
  'scripts/check-architecture-boundaries.mjs',
  'scripts/memory-candidates.mjs',
  'scripts/memory-audit.mjs',
  'scripts/feedback.mjs',
  'scripts/isolate.mjs',
  'scripts/change-contract-gate.mjs',
  'scripts/working-graph.mjs',
  'scripts/test-changed.mjs',
  'scripts/security-scan.mjs',
  'scripts/template-upstream.mjs',
];

export const HARNESS_UPSTREAM_DENY_PREFIXES = [
  'src/pages/',
  'src/components/',
  'supabase/',
  'api/',
  'state/',
  '記憶/',
];

export const HARNESS_UPSTREAM_DENY_FILES = [
  'PROJECT_MEMORY.md',
  '.cursor/hard-boundaries.json',
  '.cursor/change-contract-gate.json',
  '.cursor/hard-boundary-session-allow.json',
  '.cursor/feedback-ask-allow.json',
  '.cursor/template-upstream.json',
  '.env',
];

const TEMPLATE_MARKERS = ['.cursor/hooks.json', 'docs/agent-loop-harness.md', 'scripts/lib'];

function isTruthyEnv(value) {
  return /^(1|true|yes)$/i.test(String(value || ''));
}

export function isHarnessUpstreamFile(file) {
  const path = normalizeProjectPath(file);
  if (!path || path.includes('..')) return false;
  if (HARNESS_UPSTREAM_DENY_FILES.includes(path)) return false;
  if (HARNESS_UPSTREAM_DENY_PREFIXES.some((prefix) => path.startsWith(prefix))) return false;
  if (HARNESS_UPSTREAM_FILES.includes(path)) return true;
  if (HARNESS_UPSTREAM_PREFIXES.some((prefix) => path.startsWith(prefix))) return true;
  return /^scripts\/[^/]+\.(mjs|cjs|js)$/.test(path);
}

export function looksLikeTemplateRoot(dir) {
  if (!dir) return false;
  return TEMPLATE_MARKERS.every((marker) => existsSync(join(dir, marker)));
}

function safeRealpath(dir) {
  try {
    return existsSync(dir) ? realpathSync(dir) : resolve(dir);
  } catch {
    return resolve(dir);
  }
}

export function loadTemplateUpstreamConfig(configPath = TEMPLATE_UPSTREAM_CONFIG_PATH) {
  if (!existsSync(configPath)) {
    return { templatePath: null, source: 'missing' };
  }
  try {
    const raw = JSON.parse(readFileSync(configPath, 'utf8'));
    const templatePath = typeof raw.templatePath === 'string' ? raw.templatePath.trim() : '';
    return { templatePath: templatePath || null, source: 'file', raw };
  } catch {
    return { templatePath: null, source: 'error' };
  }
}

export function saveTemplateUpstreamPath(
  templatePath,
  configPath = TEMPLATE_UPSTREAM_CONFIG_PATH,
) {
  const next = String(templatePath || '').trim();
  if (!next) {
    throw new Error('雛形パスが空です。');
  }
  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(
    configPath,
    `${JSON.stringify({ templatePath: next, updatedAt: new Date().toISOString() }, null, 2)}\n`,
    'utf8',
  );
  return next;
}

export function resolveTemplateIdentity({
  cwd = process.cwd(),
  templatePath,
} = {}) {
  if (!templatePath) {
    return {
      role: 'unset',
      cwd: safeRealpath(cwd),
      templatePath: null,
      isSelf: false,
      canRemind: false,
    };
  }

  const cwdReal = safeRealpath(cwd);
  const destReal = safeRealpath(templatePath);
  const isSelf = cwdReal === destReal;
  return {
    role: isSelf ? 'template' : 'copy',
    cwd: cwdReal,
    templatePath: destReal,
    isSelf,
    canRemind: !isSelf && existsSync(destReal),
  };
}

export function resolveLiveTemplateUpstream(options = {}) {
  const configPath = options.configPath || process.env.TEMPLATE_UPSTREAM_CONFIG_PATH || TEMPLATE_UPSTREAM_CONFIG_PATH;
  const cwd = options.cwd || process.env.TEMPLATE_UPSTREAM_CWD || process.cwd();
  const loaded = loadTemplateUpstreamConfig(configPath);
  const identity = resolveTemplateIdentity({
    cwd,
    templatePath: options.templatePath ?? loaded.templatePath,
  });
  return { ...identity, source: loaded.source, configPath };
}

export function listChangedFiles(baseRef = 'HEAD') {
  const run = (args) => {
    try {
      return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch {
      return '';
    }
  };
  const diffFiles = run(['diff', '--name-only', '--diff-filter=ACMR', baseRef, '--'])
    .split('\n')
    .filter(Boolean);
  const untracked = run(['ls-files', '--others', '--exclude-standard']).split('\n').filter(Boolean);
  return [...new Set([...diffFiles, ...untracked])].map(normalizeProjectPath).sort();
}

export function loadTemplateUpstreamCandidates(
  filePath = TEMPLATE_UPSTREAM_CANDIDATES_PATH,
) {
  if (!existsSync(filePath)) {
    return { generatedAt: null, files: [], pendingCount: 0, source: 'missing' };
  }
  try {
    const raw = JSON.parse(readFileSync(filePath, 'utf8'));
    const files = Array.isArray(raw.files) ? raw.files : [];
    const pending = raw.status === 'dismissed' || raw.status === 'applied' ? [] : files;
    return {
      generatedAt: raw.generatedAt ?? null,
      files,
      pendingCount: pending.length,
      status: raw.status || 'pending',
      templatePath: raw.templatePath || null,
      source: 'file',
    };
  } catch {
    return { generatedAt: null, files: [], pendingCount: 0, source: 'error' };
  }
}

export function buildTemplateUpstreamCandidates({
  files,
  identity,
  previous,
} = {}) {
  const harnessFiles = (files || []).filter(isHarnessUpstreamFile);
  const status =
    identity?.canRemind && harnessFiles.length > 0
      ? 'pending'
      : previous?.status === 'pending' && (previous.files || []).length > 0
        ? previous.status
        : 'idle';
  const nextFiles = harnessFiles.length > 0 ? harnessFiles : previous?.files || [];
  return {
    generatedAt: new Date().toISOString(),
    status: harnessFiles.length > 0 ? 'pending' : status,
    files: harnessFiles.length > 0 ? harnessFiles : nextFiles,
    pendingCount: harnessFiles.length > 0 ? harnessFiles.length : status === 'pending' ? nextFiles.length : 0,
    templatePath: identity?.templatePath || null,
    role: identity?.role || 'unset',
  };
}

export function writeTemplateUpstreamCandidates(
  report,
  outputPath = TEMPLATE_UPSTREAM_CANDIDATES_PATH,
) {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return outputPath;
}

export function writeTemplateUpstreamCandidatesFromWorkspace(options = {}) {
  if (isTruthyEnv(process.env.TEMPLATE_UPSTREAM_DISABLE)) {
    return { skipped: true, reason: 'disabled' };
  }
  const identity = options.identity || resolveLiveTemplateUpstream(options);
  if (!identity.canRemind) {
    return { skipped: true, reason: identity.role, identity };
  }
  const outputPath = options.outputPath || process.env.TEMPLATE_UPSTREAM_CANDIDATES_PATH || TEMPLATE_UPSTREAM_CANDIDATES_PATH;
  const previous = loadTemplateUpstreamCandidates(outputPath);
  const report = buildTemplateUpstreamCandidates({
    files: options.files || listChangedFiles(options.baseRef),
    identity,
    previous,
  });
  writeTemplateUpstreamCandidates(report, outputPath);
  return { skipped: false, report, identity };
}

export function shouldRemindTemplateUpstream(identity, report) {
  return Boolean(identity?.canRemind && (report?.pendingCount || 0) > 0 && report.status === 'pending');
}

export function formatTemplateUpstreamForContext(identity, report, limit = 8) {
  if (!shouldRemindTemplateUpstream(identity, report)) return '';
  const files = report.files || [];
  const lines = [
    '【雛形ハーネス還元のリマインダー】',
    'コピー先でベース（ハーネス）に差分があります。雛形へは自動で書きません。',
    '戻す場合は /harness-up を実行してください。破棄は pnpm run harness:up -- --dismiss。',
    `雛形: ${identity.templatePath}`,
    `対象 ${files.length} 件:`,
  ];
  for (const file of files.slice(0, limit)) {
    lines.push(`- ${file}`);
  }
  if (files.length > limit) {
    lines.push(`- 他 ${files.length - limit} 件`);
  }
  return lines.join('\n');
}

export function dismissTemplateUpstreamCandidates(outputPath = TEMPLATE_UPSTREAM_CANDIDATES_PATH) {
  const current = loadTemplateUpstreamCandidates(outputPath);
  const report = {
    ...current,
    generatedAt: new Date().toISOString(),
    status: 'dismissed',
    pendingCount: 0,
    dismissedAt: new Date().toISOString(),
  };
  writeTemplateUpstreamCandidates(report, outputPath);
  return report;
}

export function applyTemplateUpstream({
  files,
  fromRoot = process.cwd(),
  identity,
} = {}) {
  if (!identity?.templatePath) {
    return { ok: false, reason: '雛形パスが未設定です。先に /harness-up でパスを保存してください。' };
  }
  if (identity.isSelf) {
    return { ok: false, reason: '今いる場所が雛形本人です。コピー先から実行してください。' };
  }
  if (!looksLikeTemplateRoot(identity.templatePath)) {
    return { ok: false, reason: `雛形に見えません: ${identity.templatePath}` };
  }

  const targets = (files || []).filter(isHarnessUpstreamFile);
  if (targets.length === 0) {
    return { ok: false, reason: '戻すハーネスファイルがありません。' };
  }

  const copied = [];
  const skipped = [];
  for (const file of targets) {
    const src = join(fromRoot, file);
    const dest = join(identity.templatePath, file);
    if (!existsSync(src)) {
      skipped.push({ file, reason: 'コピー先に無い' });
      continue;
    }
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
    copied.push(file);
  }

  return { ok: copied.length > 0, copied, skipped, templatePath: identity.templatePath };
}
