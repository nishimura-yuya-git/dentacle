#!/usr/bin/env node
/**
 * 危険差分の隔離 CLI（Phase E）
 *
 *   pnpm run isolate:status
 *   pnpm run isolate:recommend
 *   pnpm run isolate:worktree -- --name hb-fix
 *   pnpm run isolate:shadow-branch -- --name hb-fix
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  WORKTREES_DIR,
  evaluateIsolationNeed,
} from './lib/isolation-policy.mjs';
import { loadChangeContractGate } from './lib/change-contract-gate.mjs';
import { normalizeProjectPath } from './lib/hard-boundary-policy.mjs';

function git(args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim();
  } catch (error) {
    const details = error?.stderr || error?.message || String(error);
    console.error(details);
    process.exit(1);
  }
}

function tryGit(args) {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function listChangedFiles() {
  const diffFiles = tryGit(['diff', '--name-only', '--diff-filter=ACMR', 'HEAD', '--'])
    .split('\n')
    .filter(Boolean);
  const untracked = tryGit(['ls-files', '--others', '--exclude-standard'])
    .split('\n')
    .filter(Boolean);
  return [...new Set([...diffFiles, ...untracked])].map(normalizeProjectPath).sort();
}

function parseArgs(argv) {
  const args = [...argv];
  const command = args.shift() || 'status';
  let name = '';
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (token === '--' || token === '--json') continue;
    if (token === '--name') {
      name = String(args[i + 1] || '');
      i += 1;
      continue;
    }
    if (token.startsWith('--name=')) {
      name = token.slice('--name='.length);
    }
  }
  return { command, name: name.trim() };
}

function printEvaluation(evaluation, jsonMode) {
  if (jsonMode) {
    console.log(JSON.stringify(evaluation, null, 2));
    return;
  }

  console.log('[isolate] 隔離判定');
  console.log(`level: ${evaluation.level}`);
  console.log(`branch: ${evaluation.suggestedBranch}`);
  console.log(`worktree: ${evaluation.suggestedWorktreePath}`);
  console.log('');
  console.log('reasons:');
  if (evaluation.reasons.length === 0) {
    console.log('- なし');
  } else {
    for (const reason of evaluation.reasons) {
      console.log(`- ${reason}`);
    }
  }
  console.log('');
  console.log('next:');
  for (const action of evaluation.nextActions) {
    console.log(`- ${action}`);
  }
}

function createShadowBranch(evaluation) {
  const branch = evaluation.suggestedBranch;
  const current = tryGit(['rev-parse', '--abbrev-ref', 'HEAD']);
  if (!current) {
    console.error('Git リポジトリ内で実行してください。');
    process.exit(1);
  }

  const existing = tryGit(['branch', '--list', branch]);
  if (existing) {
    console.error(`ブランチが既に存在します: ${branch}`);
    process.exit(1);
  }

  // HEAD からブランチを作るだけ。checkout はしない（未コミット差分を壊さない）
  git(['branch', branch, 'HEAD']);
  console.log(`[isolate] shadow branch を作成しました（checkout なし）: ${branch}`);
  console.log(`現在ブランチ: ${current}`);
  console.log('作業を移す場合は worktree 推奨: pnpm run isolate:worktree');
}

function createWorktree(evaluation) {
  const branch = evaluation.suggestedBranch;
  const worktreePath = evaluation.suggestedWorktreePath;
  const abs = resolve(worktreePath);

  if (existsSync(abs)) {
    console.error(`worktree パスが既に存在します: ${worktreePath}`);
    process.exit(1);
  }

  mkdirSync(WORKTREES_DIR, { recursive: true });

  const existingBranch = tryGit(['branch', '--list', branch]);
  if (existingBranch) {
    git(['worktree', 'add', abs, branch]);
  } else {
    git(['worktree', 'add', '-b', branch, abs, 'HEAD']);
  }

  console.log('[isolate] worktree を作成しました');
  console.log(`path: ${worktreePath}`);
  console.log(`branch: ${branch}`);
  console.log('');
  console.log('次の手順:');
  console.log(`1. cd ${worktreePath}`);
  console.log('2. そこで実装・検証する（main 側の未コミット差分は触らない）');
  console.log('3. 完了後、パッチ/PR化を検討する');
  console.log(`4. 不要になったら: git worktree remove ${worktreePath}`);
}

const { command, name } = parseArgs(process.argv.slice(2));
const jsonMode = process.argv.includes('--json');
const files = listChangedFiles();
const gate = loadChangeContractGate();
const evaluation = evaluateIsolationNeed({ files, gate, name: name || undefined });

switch (command) {
  case 'status':
  case 'recommend':
    printEvaluation(evaluation, jsonMode);
    if (evaluation.level === 'required') process.exitCode = 2;
    break;
  case 'shadow-branch':
    printEvaluation(evaluation, false);
    console.log('');
    createShadowBranch(evaluation);
    break;
  case 'worktree':
    printEvaluation(evaluation, false);
    console.log('');
    createWorktree(evaluation);
    break;
  default:
    console.error(`未対応コマンド: ${command}`);
    console.error('status / recommend / shadow-branch / worktree を指定してください。');
    process.exit(1);
}
