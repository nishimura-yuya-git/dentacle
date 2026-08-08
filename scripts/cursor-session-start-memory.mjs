#!/usr/bin/env node
/**
 * sessionStart: 未反映の MEMORY 追記候補があれば additional_context に注入する。
 */
import { readFileSync } from 'node:fs';
import {
  MEMORY_CANDIDATES_PATH,
  formatCandidatesForContext,
  loadMemoryCandidates,
} from './lib/memory-candidates.mjs';

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function main() {
  try {
    const raw = readStdin();
    if (raw.trim()) JSON.parse(raw);
  } catch {
    // ignore
  }

  if (String(process.env.MEMORY_CANDIDATES_DISABLE || '').match(/^(1|true|yes)$/i)) {
    process.stdout.write(JSON.stringify({}));
    return;
  }

  const report = loadMemoryCandidates(MEMORY_CANDIDATES_PATH);
  const context = formatCandidatesForContext(report);

  if (!context) {
    process.stdout.write(JSON.stringify({}));
    return;
  }

  process.stdout.write(
    JSON.stringify({
      additional_context: context,
    }),
  );
}

main();
