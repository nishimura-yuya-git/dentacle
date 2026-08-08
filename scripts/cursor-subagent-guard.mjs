#!/usr/bin/env node
/**
 * Cursor subagentStart ガード（Phase C）。
 * read-only / write 系の権限と、変更契約・Hard Boundary 条件を強制する。
 */
import { readFileSync } from 'node:fs';
import { evaluateSubagentStart } from './lib/subagent-policy.mjs';

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function allow() {
  process.stdout.write(JSON.stringify({ permission: 'allow' }));
}

function deny(userMessage, agentMessage) {
  process.stdout.write(
    JSON.stringify({
      permission: 'deny',
      user_message: userMessage,
      // subagentStart は公式には user_message のみだが、agent_message も添えておく
      agent_message: agentMessage,
    }),
  );
}

function main() {
  const raw = readStdin();
  if (!raw.trim()) {
    allow();
    return;
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    deny(
      'サブエージェントガード: フック入力の JSON 解析に失敗しました。',
      'cursor-subagent-guard: stdin JSON が不正です。',
    );
    return;
  }

  const decision = evaluateSubagentStart(payload, {
    env: process.env,
    policyPath: process.env.SUBAGENT_POLICY_PATH,
    gatePath: process.env.CHANGE_CONTRACT_GATE_PATH,
    boundaryConfigPath: process.env.HARD_BOUNDARY_CONFIG,
  });

  if (decision.decision === 'deny') {
    deny(decision.userMessage, decision.agentMessage);
    return;
  }

  allow();
}

main();
