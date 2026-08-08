#!/usr/bin/env node
/**
 * Cursor stop / sessionStart 用セキュリティ hook。
 *
 * - stop: 検査バンドルを実行し、失敗時は followup_message で完成を差し戻す
 * - sessionStart: 前回失敗が残っていれば additional_context でリマインドする
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import {
  formatSecurityHookContext,
  runSecurityHookBundle,
} from './lib/security-hook-runner.mjs';

const LAST_REPORT_PATH = path.join('state', 'security-hook-last.json');

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function detectEventName(payload) {
  return (
    payload?.hook_event_name ||
    payload?.event ||
    process.env.CURSOR_HOOK_EVENT ||
    ''
  );
}

function writeLastReport(report) {
  mkdirSync(path.dirname(LAST_REPORT_PATH), { recursive: true });
  writeFileSync(
    LAST_REPORT_PATH,
    `${JSON.stringify({ ...report, savedAt: new Date().toISOString() }, null, 2)}\n`,
    'utf8',
  );
}

function loadLastReport() {
  if (!existsSync(LAST_REPORT_PATH)) return null;
  try {
    return JSON.parse(readFileSync(LAST_REPORT_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function handleStop() {
  const report = runSecurityHookBundle();
  writeLastReport(report);

  if (report.followup) {
    process.stdout.write(JSON.stringify({ followup_message: report.followup }));
    return;
  }

  process.stdout.write(JSON.stringify({}));
}

function handleSessionStart() {
  const last = loadLastReport();
  const context = formatSecurityHookContext(last);
  if (!context) {
    process.stdout.write(JSON.stringify({}));
    return;
  }
  process.stdout.write(JSON.stringify({ additional_context: context }));
}

function main() {
  let payload = {};
  const raw = readStdin();
  if (raw.trim()) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = {};
    }
  }

  const eventName = String(detectEventName(payload)).toLowerCase();
  if (eventName.includes('sessionstart') || eventName === 'session_start') {
    handleSessionStart();
    return;
  }

  // 既定は stop（完成ゲート）
  handleStop();
}

main();
