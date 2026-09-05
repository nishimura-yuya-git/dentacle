#!/usr/bin/env node
/**
 * sessionEnd: MEMORY 追記候補と雛形還元候補を state に書き出す。
 * PROJECT_MEMORY.md と雛形本体は編集しない。
 */
import { readFileSync } from 'node:fs';
import {
  MEMORY_CANDIDATES_PATH,
  buildMemoryCandidates,
  writeMemoryCandidates,
} from './lib/memory-candidates.mjs';
import { writeTemplateUpstreamCandidatesFromWorkspace } from './lib/template-upstream-policy.mjs';

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function isTruthyEnv(value) {
  return /^(1|true|yes)$/i.test(String(value || ''));
}

function main() {
  try {
    const raw = readStdin();
    if (raw.trim()) JSON.parse(raw);
  } catch {
    // ignore
  }

  if (!isTruthyEnv(process.env.MEMORY_CANDIDATES_DISABLE)) {
    const report = buildMemoryCandidates({ outputPath: MEMORY_CANDIDATES_PATH });
    writeMemoryCandidates(report, MEMORY_CANDIDATES_PATH);
  }

  try {
    writeTemplateUpstreamCandidatesFromWorkspace();
  } catch (error) {
    process.stderr.write(`[harness-up] sessionEnd ignored: ${error}\n`);
  }
}

main();
