#!/usr/bin/env node
/**
 * PROJECT_MEMORY 追記候補 CLI（Phase D）
 *
 *   pnpm run memory:candidates
 *   pnpm run memory:candidates -- --write
 *   pnpm run memory:candidates -- --dismiss hb-diff
 *   pnpm run memory:candidates -- --add '{"id":"chat-x","category":"仕様決定","title":"...","event":"..."}'
 *   pnpm run memory:candidates -- --learned chat-x
 */
import { readFileSync } from 'node:fs';
import {
  MEMORY_CANDIDATES_PATH,
  addChatMemoryCandidates,
  buildMemoryCandidates,
  dismissMemoryCandidate,
  formatCandidatesForContext,
  markMemoryCandidatesLearned,
  writeMemoryCandidates,
} from './lib/memory-candidates.mjs';

const args = process.argv.slice(2);
const write = args.includes('--write');
const jsonMode = args.includes('--json');
const dismissIdx = args.indexOf('--dismiss');
const dismissId = dismissIdx >= 0 ? args[dismissIdx + 1] : null;
const addIdx = args.indexOf('--add');
const addPayload = addIdx >= 0 ? args[addIdx + 1] : null;
const learnedIdx = args.indexOf('--learned');
const learnedId = learnedIdx >= 0 ? args[learnedIdx + 1] : null;

if (dismissId) {
  const report = dismissMemoryCandidate(dismissId);
  if (jsonMode) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`[memory:candidates] dismissed: ${dismissId}`);
    console.log(`pending: ${report.pendingCount}`);
  }
  process.exit(0);
}

if (learnedId) {
  const report = markMemoryCandidatesLearned(learnedId);
  if (jsonMode) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`[memory:candidates] learned: ${learnedId}`);
    console.log(`pending: ${report.pendingCount}`);
  }
  process.exit(0);
}

if (addPayload) {
  let items;
  try {
    const raw = addPayload === '-' ? readFileSync(0, 'utf8') : addPayload;
    const parsed = JSON.parse(raw);
    items = Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    console.error('[memory:candidates] --add の JSON が不正です:', error.message);
    process.exit(1);
  }

  const { report, added, skipped } = addChatMemoryCandidates(items);
  if (jsonMode) {
    console.log(JSON.stringify({ added, skipped, report }, null, 2));
  } else {
    console.log(`[memory:candidates] chat候補を登録: +${added.length}`);
    if (added.length) console.log(`  added: ${added.join(', ')}`);
    if (skipped.length) {
      console.log(
        `  skipped: ${skipped.map((item) => `${item.id || '?'}(${item.reason})`).join(', ')}`,
      );
    }
    console.log(`pending: ${report.pendingCount}`);
    console.log(`output: ${MEMORY_CANDIDATES_PATH}`);
  }
  process.exit(0);
}

const report = buildMemoryCandidates({ outputPath: MEMORY_CANDIDATES_PATH });

if (write) {
  writeMemoryCandidates(report);
}

if (jsonMode) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

console.log('[memory:candidates] PROJECT_MEMORY 追記候補');
console.log(`pending: ${report.pendingCount}, stale: ${report.staleCount}`);
console.log(`gate: ${report.gateMode}`);
console.log(`output: ${write ? MEMORY_CANDIDATES_PATH : '(未保存。--write で保存 / --add は即保存)'}`);
console.log('');

const pending = report.candidates.filter((item) => item.status === 'pending');
if (pending.length === 0) {
  console.log('- 未反映の追記候補はありません。');
} else {
  for (const item of pending) {
    const src = item.source === 'chat' ? ' chat' : '';
    console.log(`- [${item.category}] ${item.title}${item.stale ? '（要再確認）' : ''}${src}`);
    console.log(`  id: ${item.id}`);
    console.log(`  事象: ${item.event}`);
    console.log(`  次: ${item.nextAction}`);
    if (item.related?.length) {
      console.log(`  関連: ${item.related.join(', ')}`);
    }
  }
  console.log('');
  console.log('反映する場合: チャットに追記候補を出し、ユーザーに /project-memory-learn を促す');
  console.log('破棄する場合: pnpm run memory:candidates -- --dismiss <id>');
  console.log('学習済みにする: pnpm run memory:candidates -- --learned <id>');
  console.log('チャット候補登録: pnpm run memory:candidates -- --add \'<json>\'');
}

if (!write && pending.length > 0) {
  console.log('');
  console.log(formatCandidatesForContext(report));
}
