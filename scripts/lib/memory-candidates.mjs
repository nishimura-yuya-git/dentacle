/**
 * PROJECT_MEMORY 追記候補の自動生成（Phase D）。
 * PROJECT_MEMORY.md 自体は書かない。候補だけ state に残す。
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  DEFAULT_BOUNDARY_CONFIG_PATH,
  getProtectedPatterns,
  matchHardBoundary,
  normalizeProjectPath,
} from './hard-boundary-policy.mjs';
import { CHANGE_CONTRACT_GATE_PATH, loadChangeContractGate } from './change-contract-gate.mjs';

export const MEMORY_CANDIDATES_PATH = 'state/memory-candidates.json';
export const DEFAULT_STALE_DAYS = 7;

function tryGit(args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

function listChangedFiles(baseRef = 'HEAD') {
  const diffFiles = tryGit(['diff', '--name-only', '--diff-filter=ACMR', baseRef, '--'])
    .split('\n')
    .filter(Boolean);
  const untracked = tryGit(['ls-files', '--others', '--exclude-standard'])
    .split('\n')
    .filter(Boolean);
  return [...new Set([...diffFiles, ...untracked])].map(normalizeProjectPath).sort();
}

function daysBetween(isoDate, now = Date.now()) {
  const ms = Date.parse(isoDate);
  if (Number.isNaN(ms)) return 0;
  return (now - ms) / (1000 * 60 * 60 * 24);
}

export function loadMemoryCandidates(filePath = MEMORY_CANDIDATES_PATH) {
  if (!existsSync(filePath)) {
    return {
      generatedAt: null,
      candidates: [],
      pendingCount: 0,
      staleCount: 0,
      source: 'missing',
    };
  }

  try {
    const raw = JSON.parse(readFileSync(filePath, 'utf8'));
    const candidates = Array.isArray(raw.candidates) ? raw.candidates : [];
    return {
      generatedAt: raw.generatedAt ?? null,
      candidates,
      pendingCount: candidates.filter((c) => c.status === 'pending').length,
      staleCount: candidates.filter((c) => c.stale).length,
      source: 'file',
    };
  } catch {
    return {
      generatedAt: null,
      candidates: [],
      pendingCount: 0,
      staleCount: 0,
      source: 'error',
    };
  }
}

function buildCandidate({ id, category, title, event, nextAction, related, staleNote }) {
  return {
    id,
    category,
    title,
    event,
    nextAction,
    related,
    status: 'pending',
    stale: Boolean(staleNote),
    staleNote: staleNote || null,
    createdAt: new Date().toISOString(),
  };
}

/**
 * 差分とゲート状態から追記候補を組み立てる。
 * 会話ログは使わない（memory-learning 方針）。
 */
export function buildMemoryCandidates(options = {}) {
  const baseRef = options.baseRef || 'HEAD';
  const boundaryConfig = options.boundaryConfigPath || DEFAULT_BOUNDARY_CONFIG_PATH;
  const staleDays = options.staleDays ?? DEFAULT_STALE_DAYS;
  const files = options.files || listChangedFiles(baseRef);
  const { patterns } = getProtectedPatterns(boundaryConfig);
  const gate = options.gate || loadChangeContractGate(options.gatePath || CHANGE_CONTRACT_GATE_PATH);

  const candidates = [];
  const hbHits = [];

  for (const file of files) {
    const hit = matchHardBoundary(file, patterns);
    if (hit.matched) hbHits.push(hit);
  }

  if (hbHits.length > 0) {
    candidates.push(
      buildCandidate({
        id: 'hb-diff',
        category: '仕様決定',
        title: 'Hard Boundary 差分の学習要否',
        event: `保護対象に差分があります: ${hbHits
          .map((hit) => `${hit.label}:${hit.file}`)
          .join(', ')}`,
        nextAction:
          '変更が仕様として残るなら /project-memory-learn で追記候補を確定する。単なる作業差分なら候補を破棄してよい。',
        related: hbHits.map((hit) => hit.file),
      }),
    );
  }

  if (gate.mode === 'approved' || gate.mode === 'pending') {
    candidates.push(
      buildCandidate({
        id: 'contract-gate',
        category: '仕様決定',
        title: '変更契約ゲート利用の振り返り',
        event: `変更契約ゲートが ${gate.mode} です（reason: ${gate.reason || 'なし'}）。`,
        nextAction:
          '今回の承認範囲・whitelist が今後も守るべきなら PROJECT_MEMORY 追記候補を出す。作業終了なら contract:close する。',
        related: [
          CHANGE_CONTRACT_GATE_PATH,
          ...(gate.whitelist || []),
          ...(gate.proposed_whitelist || []),
        ],
      }),
    );
  }

  const harnessFiles = files.filter(
    (file) =>
      file.startsWith('scripts/cursor-') ||
      file.startsWith('scripts/lib/') ||
      file.startsWith('scripts/loop-') ||
      file.startsWith('loops/') ||
      file === '.cursor/hooks.json' ||
      file === '.cursor/subagent-policy.json' ||
      file === 'docs/agent-loop-harness.md',
  );

  if (harnessFiles.length > 0) {
    candidates.push(
      buildCandidate({
        id: 'harness-change',
        category: '仕様決定',
        title: 'ハーネス変更の長期記憶化',
        event: `エージェントハーネス関連ファイルに差分があります: ${harnessFiles.join(', ')}`,
        nextAction:
          '運用ルールとして残す変更なら /project-memory-learn。一時実験なら候補を破棄。',
        related: harnessFiles,
      }),
    );
  }

  // 既存候補の staleness をマージ（同じ id は新しい event を優先しつつ createdAt を維持）
  const previous = options.previous || loadMemoryCandidates(options.outputPath || MEMORY_CANDIDATES_PATH);
  const byId = new Map();

  for (const old of previous.candidates || []) {
    const age = daysBetween(old.createdAt || previous.generatedAt || new Date().toISOString());
    const stale = age >= staleDays;
    byId.set(old.id, {
      ...old,
      stale,
      staleNote: stale
        ? `作成から約 ${Math.floor(age)} 日経過。反映前に現状との整合を要再確認。`
        : old.staleNote || null,
    });
  }

  for (const next of candidates) {
    const prev = byId.get(next.id);
    if (prev && prev.status === 'dismissed') {
      continue;
    }
    byId.set(next.id, {
      ...next,
      createdAt: prev?.createdAt || next.createdAt,
      status: prev?.status === 'pending' || !prev ? 'pending' : prev.status,
      stale: prev ? prev.stale : false,
      staleNote: prev?.staleNote || null,
    });
  }

  const merged = [...byId.values()].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const pending = merged.filter((item) => item.status === 'pending');

  return {
    generatedAt: new Date().toISOString(),
    staleDays,
    candidates: merged,
    pendingCount: pending.length,
    staleCount: pending.filter((item) => item.stale).length,
    changedFiles: files,
    gateMode: gate.mode,
  };
}

export function writeMemoryCandidates(report, outputPath = MEMORY_CANDIDATES_PATH) {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return outputPath;
}

export function formatCandidatesForContext(report, limit = 5) {
  const pending = (report.candidates || []).filter((item) => item.status === 'pending');
  if (pending.length === 0) return '';

  const lines = [
    '【PROJECT_MEMORY 追記候補の未反映リマインダー】',
    `未反映 ${pending.length} 件（stale ${report.staleCount || 0} 件）。PROJECT_MEMORY.md は自動編集しない。`,
    '応答の早い段階で未反映候補を一括再提示し、ユーザーに /project-memory-learn を促すこと。',
    'チャット由来候補は `pnpm run memory:candidates -- --add` で state に残す（会話ログ自動解析はしない）。',
    '',
  ];

  for (const item of pending.slice(0, limit)) {
    lines.push(`- [${item.category}] ${item.title}${item.stale ? '（要再確認）' : ''}`);
    lines.push(`  事象: ${item.event}`);
    lines.push(`  次: ${item.nextAction}`);
  }

  if (pending.length > limit) {
    lines.push(`- 他 ${pending.length - limit} 件（pnpm run memory:candidates で確認）`);
  }

  return lines.join('\n');
}

export function dismissMemoryCandidate(id, outputPath = MEMORY_CANDIDATES_PATH) {
  const current = loadMemoryCandidates(outputPath);
  const candidates = current.candidates.map((item) =>
    item.id === id ? { ...item, status: 'dismissed', dismissedAt: new Date().toISOString() } : item,
  );
  const report = {
    ...current,
    generatedAt: new Date().toISOString(),
    candidates,
    pendingCount: candidates.filter((item) => item.status === 'pending').length,
    staleCount: candidates.filter((item) => item.status === 'pending' && item.stale).length,
  };
  writeMemoryCandidates(report, outputPath);
  return report;
}

/**
 * チャット提示した追記候補を state に登録する（会話ログ自動解析はしない）。
 * sessionStart リマインド・sessionEnd マージで取りこぼしを防ぐ。
 */
export function addChatMemoryCandidates(items, outputPath = MEMORY_CANDIDATES_PATH) {
  const list = Array.isArray(items) ? items : [items];
  const current = loadMemoryCandidates(outputPath);
  const byId = new Map((current.candidates || []).map((item) => [item.id, item]));

  const added = [];
  const skipped = [];

  for (const raw of list) {
    if (!raw || typeof raw !== 'object') {
      skipped.push({ id: null, reason: 'invalid_item' });
      continue;
    }
    const id = String(raw.id || '').trim();
    if (!id) {
      skipped.push({ id: null, reason: 'missing_id' });
      continue;
    }
    const prev = byId.get(id);
    if (prev?.status === 'dismissed' || prev?.status === 'learned') {
      skipped.push({ id, reason: prev.status });
      continue;
    }

    const next = buildCandidate({
      id,
      category: String(raw.category || '仕様決定'),
      title: String(raw.title || id),
      event: String(raw.event || raw.title || id),
      nextAction:
        String(raw.nextAction || 'チャットに追記候補を再提示し、/project-memory-learn を促す。'),
      related: Array.isArray(raw.related) ? raw.related.map(String) : [],
    });
    next.source = 'chat';
    next.createdAt = prev?.createdAt || next.createdAt;
    byId.set(id, next);
    added.push(id);
  }

  const candidates = [...byId.values()].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const report = {
    generatedAt: new Date().toISOString(),
    staleDays: current.staleDays ?? DEFAULT_STALE_DAYS,
    candidates,
    pendingCount: candidates.filter((item) => item.status === 'pending').length,
    staleCount: candidates.filter((item) => item.status === 'pending' && item.stale).length,
    gateMode: current.gateMode || null,
    source: 'chat-add',
  };
  writeMemoryCandidates(report, outputPath);
  return { report, added, skipped };
}

/** /project-memory-learn 反映後に候補を学習済みにする */
export function markMemoryCandidatesLearned(ids, outputPath = MEMORY_CANDIDATES_PATH) {
  const idSet = new Set((Array.isArray(ids) ? ids : [ids]).map(String));
  const current = loadMemoryCandidates(outputPath);
  const candidates = current.candidates.map((item) =>
    idSet.has(item.id)
      ? { ...item, status: 'learned', learnedAt: new Date().toISOString() }
      : item,
  );
  const report = {
    ...current,
    generatedAt: new Date().toISOString(),
    candidates,
    pendingCount: candidates.filter((item) => item.status === 'pending').length,
    staleCount: candidates.filter((item) => item.status === 'pending' && item.stale).length,
  };
  writeMemoryCandidates(report, outputPath);
  return report;
}
