#!/usr/bin/env node
/**
 * Cursor subagentStop ガード（Phase C）。
 * サブエージェントが Hard Boundary を変更していたら follow-up で停止を指示する。
 */
import { readFileSync } from 'node:fs';
import { evaluateSubagentStop } from './lib/subagent-policy.mjs';

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function main() {
  const raw = readStdin();
  if (!raw.trim()) {
    process.stdout.write(JSON.stringify({}));
    return;
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    process.stdout.write(
      JSON.stringify({
        followup_message:
          'サブエージェント停止フックの入力 JSON が不正です。差分を手動確認してください。',
      }),
    );
    return;
  }

  const result = evaluateSubagentStop(payload, {
    boundaryConfigPath: process.env.HARD_BOUNDARY_CONFIG,
  });

  if (result.followup) {
    process.stdout.write(JSON.stringify({ followup_message: result.followup }));
    return;
  }

  process.stdout.write(JSON.stringify({}));
}

main();
