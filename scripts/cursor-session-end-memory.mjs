#!/usr/bin/env node
/**
 * sessionEnd: 追記候補を state に書き出す（fire-and-forget）。
 * PROJECT_MEMORY.md は編集しない。
 */
import { readFileSync } from 'node:fs';
import {
  MEMORY_CANDIDATES_PATH,
  buildMemoryCandidates,
  writeMemoryCandidates,
} from './lib/memory-candidates.mjs';

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function main() {
  // stdin は将来の拡張用。失敗しても候補生成は続行する。
  try {
    const raw = readStdin();
    if (raw.trim()) JSON.parse(raw);
  } catch {
    // ignore
  }

  if (String(process.env.MEMORY_CANDIDATES_DISABLE || '').match(/^(1|true|yes)$/i)) {
    return;
  }

  const report = buildMemoryCandidates({ outputPath: MEMORY_CANDIDATES_PATH });
  writeMemoryCandidates(report, MEMORY_CANDIDATES_PATH);
}

main();
