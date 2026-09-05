#!/usr/bin/env node
/**
 * sessionStart: MEMORY 候補 + 雛形還元を同じ additional_context に載せる（last-wins 回避）。
 */
import { readFileSync } from 'node:fs';
import {
  MEMORY_CANDIDATES_PATH,
  formatCandidatesForContext,
  loadMemoryCandidates,
} from './lib/memory-candidates.mjs';
import {
  TEMPLATE_UPSTREAM_CANDIDATES_PATH,
  formatTemplateUpstreamForContext,
  loadTemplateUpstreamCandidates,
  resolveLiveTemplateUpstream,
} from './lib/template-upstream-policy.mjs';

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

function loadMemoryContext() {
  if (isTruthyEnv(process.env.MEMORY_CANDIDATES_DISABLE)) return '';
  const candidatesPath = process.env.MEMORY_CANDIDATES_PATH || MEMORY_CANDIDATES_PATH;
  return formatCandidatesForContext(loadMemoryCandidates(candidatesPath));
}

function loadTemplateUpstreamContext() {
  if (isTruthyEnv(process.env.TEMPLATE_UPSTREAM_DISABLE)) return '';
  try {
    const identity = resolveLiveTemplateUpstream();
    const candidatesPath = process.env.TEMPLATE_UPSTREAM_CANDIDATES_PATH || TEMPLATE_UPSTREAM_CANDIDATES_PATH;
    return formatTemplateUpstreamForContext(identity, loadTemplateUpstreamCandidates(candidatesPath));
  } catch (error) {
    process.stderr.write(`[harness-up] internal error (ignored): ${error}\n`);
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

  const parts = [loadMemoryContext(), loadTemplateUpstreamContext()].filter(Boolean);
  if (parts.length === 0) {
    process.stdout.write(JSON.stringify({}));
    return;
  }

  process.stdout.write(
    JSON.stringify({
      additional_context: parts.join('\n\n'),
    }),
  );
}

main();
