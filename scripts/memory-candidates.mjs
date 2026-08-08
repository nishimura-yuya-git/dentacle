#!/usr/bin/env node
/**
 * PROJECT_MEMORY 追記候補 CLI（Phase D）
 *
 *   pnpm run memory:candidates
 *   pnpm run memory:candidates -- --write
 *   pnpm run memory:candidates -- --dismiss hb-diff
 */
import {
  MEMORY_CANDIDATES_PATH,
  buildMemoryCandidates,
  dismissMemoryCandidate,
  formatCandidatesForContext,
  loadMemoryCandidates,
  writeMemoryCandidates,
} from './lib/memory-candidates.mjs';

const args = process.argv.slice(2);
const write = args.includes('--write');
const jsonMode = args.includes('--json');
const dismissIdx = args.indexOf('--dismiss');
const dismissId = dismissIdx >= 0 ? args[dismissIdx + 1] : null;

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
console.log(`output: ${write ? MEMORY_CANDIDATES_PATH : '(未保存。--write で保存)'}`);
console.log('');

const pending = report.candidates.filter((item) => item.status === 'pending');
if (pending.length === 0) {
  console.log('- 未反映の追記候補はありません。');
} else {
  for (const item of pending) {
    console.log(`- [${item.category}] ${item.title}${item.stale ? '（要再確認）' : ''}`);
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
}

if (!write && pending.length > 0) {
  console.log('');
  console.log(formatCandidatesForContext(report));
}
