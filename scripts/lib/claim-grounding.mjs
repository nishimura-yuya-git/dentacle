/**
 * 薄い知識Graph層: Claim Grounding（主張 ↔ 根拠）。
 *
 * 評価器–最適化器のグラウンディング層に相当する。
 * 完成宣言があるときだけ検証し、無いときは skip（通常の loop:run を邪魔しない）。
 *
 * 本格 NER/グラフDB は持たない。インターフェース（根拠リンク）だけ本格互換にする。
 *
 * UI Polish では Observe Loop 原則を適用する:
 * 見た目・画面変化の完成主張は、キャプチャ／snapshot を Read した証拠が無いと stop。
 * 加えてページ枠照合（見本キャプチャと実装キャプチャのペア）が無いと stop。
 * 借り契約（参照の正体 / 対象枠 / 借りてよい / 借りない）が無いと stop。
 * 操作観察（端の開閉。無しなら「なし（端の開閉なし）」）が無いと stop。
 * AI処理観察（実行中。無しなら「なし（AI処理なし）」）が無いと stop。
 * 観察で残した阻害が未解消、または「観察で残した阻害: なし」が無いと stop。
 */

import { existsSync, readFileSync } from 'node:fs';

export const DEFAULT_DECLARATION_PATH = 'state/completion-declaration.md';

const RESULT_RE = /\b(pass|warn|stop)\b/i;
const COMMAND_RE = /(?:コマンド|command)\s*[:：]\s*(.+)/i;
const RESULT_LINE_RE = /(?:結果|result|status)\s*[:：]\s*(pass|warn|stop)/i;
const EVIDENCE_LINE_RE = /(?:根拠|Evidence Map|evidence|Stop非該当の根拠)\s*[:：]\s*(.+)/i;
const PATH_RE = /`([^`]+)`/g;
const MEMORY_REF_RE = /PROJECT_MEMORY\.md|§\s*\d+|memory\s*:/i;
const PNPM_RE = /pnpm\s+run\s+[\w:-]+/;
const OBSERVE_KIND_RE = /(?:種別|type)\s*[:：]\s*(snapshot|screenshot)/i;
const OBSERVE_PATH_LINE_RE = /(?:パス|path)\s*[:：]\s*(.+)/i;
const OBSERVE_READ_RE = /(?:Read済み|read(?:\s*済み)?|read)\s*[:：]\s*(はい|yes|true)\s*(.*)/i;
const PLACEHOLDER_RE = /^(…|\.\.\.|なし|n\/a|-)?$/i;
const UNCONFIRMED_NOTE_RE = /^(未確認|未観察|空欄)$/i;
const NONE_LIKE_RE = /^(なし|n\/a|指示のみ)(（指示のみ）)?$/i;
const EDGE_SKIP_RE = /端の開閉なし/;
const AI_SKIP_RE = /AI処理なし/;
const AI_PROCESSING_FILE_RE =
  /ComposingOrb|AiComposingOverlay|thinking-orbs|GapFillPanel|GenerateProposalSection/;
const OBSERVE_BLOCKER_LINE_RE = /観察で残した阻害\s*[:：]\s*(.+)/i;
const CLEAR_BLOCKER_RE = /^(なし|none|n\/a|-|無し)([。．.]*)?$/i;
const UNRESOLVED_PROBLEM_RE = /重複|重なり|重なる|隠蔽|見切れ|二重|衝突/;
const PROBLEM_RESOLVED_RE =
  /解消|修正済|直した|なくなった|残っていない|阻害なし|衝突なし|重なりなし|重複なし|見切れなし|隠蔽なし/;

/**
 * 観察差分に未解消の阻害が残っているか。
 * 「重複は解消した」は未解消ではない。
 * @param {string} note
 */
export function hasUnresolvedObserveProblems(note) {
  const text = String(note ?? '').trim();
  if (!text) return false;
  if (!UNRESOLVED_PROBLEM_RE.test(text)) return false;
  return !PROBLEM_RESOLVED_RE.test(text);
}

/**
 * 「観察で残した阻害」欄が完成してよいか。
 * @param {string | null} raw
 */
export function isObserveBlockersCleared(raw) {
  const text = String(raw ?? '').trim();
  return Boolean(text) && CLEAR_BLOCKER_RE.test(text);
}

/**
 * @param {string} value
 */
function isMeaningful(value) {
  const text = String(value ?? '').trim();
  return text.length > 1 && !PLACEHOLDER_RE.test(text);
}

/**
 * 「なし（指示のみ）」は見本キャプチャ欠落として許可する。
 * @param {string} value
 */
function isNoneLike(value) {
  const text = String(value ?? '')
    .trim()
    .replace(/^`|`$/g, '');
  return NONE_LIKE_RE.test(text) || /指示のみ/.test(text);
}

/**
 * 端の開閉が無い画面は「なし（端の開閉なし）」で操作観察を充足する。
 * @param {string} value
 */
function isEdgeSkip(value) {
  const text = String(value ?? '')
    .trim()
    .replace(/^`|`$/g, '');
  return isNoneLike(text) || EDGE_SKIP_RE.test(text);
}

/**
 * AI処理が無い画面は「なし（AI処理なし）」で AI処理観察を充足する。
 * @param {string} value
 */
export function isAiProcessingSkip(value) {
  const text = String(value ?? '')
    .trim()
    .replace(/^`|`$/g, '');
  return AI_SKIP_RE.test(text);
}

/**
 * 差分が AI 裏処理 UI に触れているか。
 * 触れているのに「AI処理なし」は不足（実行中観察が必要）。
 * @param {string[]} changedFiles
 */
export function touchesAiProcessingUi(changedFiles = []) {
  return (changedFiles ?? []).some((file) => AI_PROCESSING_FILE_RE.test(String(file)));
}

/**
 * 差分ノートとして使えるか（未確認は不可）。
 * @param {string} value
 */
function isConfirmedNote(value) {
  const text = String(value ?? '').trim();
  return isMeaningful(text) && !UNCONFIRMED_NOTE_RE.test(text);
}

/**
 * @param {string} raw
 */
function stripPathTicks(raw) {
  return String(raw ?? '')
    .trim()
    .replace(/^`|`$/g, '');
}

/**
 * 完成宣言テキストをパースする。
 * @param {string} text
 */
export function parseCompletionDeclaration(text) {
  const source = String(text ?? '');
  const lines = source.split('\n');

  let evaluationCommand = null;
  let evaluationResult = null;
  let evidenceNotes = [];
  const evidencePaths = [];
  let observeKind = null;
  const observePaths = [];
  let observeReadConfirmed = false;
  let observeReadNote = '';
  let inObserveSection = false;
  let inChromeSection = false;
  let inEdgeSection = false;
  let inAiSection = false;
  let edgeTarget = null;
  let edgeKind = null;
  const edgePaths = [];
  let edgeReadConfirmed = false;
  let edgeReadNote = '';
  let aiTarget = null;
  let aiKind = null;
  const aiPaths = [];
  let aiReadConfirmed = false;
  let aiReadNote = '';
  let chromeReference = null;
  const chromeImplementationPaths = [];
  let chromeDiff = '';
  let chromeReadConfirmed = false;
  let referenceIdentity = null;
  let targetChrome = null;
  let borrowAllow = null;
  let borrowDeny = null;
  let observeBlockersRaw = null;

  for (const line of lines) {
    if (/AI処理観察|ai\s*processing\s*observe/i.test(line)) {
      inAiSection = true;
      inEdgeSection = false;
      inChromeSection = false;
      inObserveSection = false;
    } else if (/操作観察|edge\s*overlay|edge\s*observe/i.test(line)) {
      inEdgeSection = true;
      inAiSection = false;
      inChromeSection = false;
      inObserveSection = false;
    } else if (/ページ枠照合|chrome\s*compare/i.test(line)) {
      inChromeSection = true;
      inObserveSection = false;
      inEdgeSection = false;
      inAiSection = false;
    } else if (/観察証拠|Observe\s*evidence/i.test(line)) {
      inObserveSection = true;
      inChromeSection = false;
      inEdgeSection = false;
      inAiSection = false;
    } else if (/^\s*#{1,6}\s+/.test(line)) {
      inObserveSection = false;
      inChromeSection = false;
      inEdgeSection = false;
      inAiSection = false;
    }

    const commandMatch = line.match(COMMAND_RE);
    if (commandMatch) {
      evaluationCommand = commandMatch[1].trim();
    }

    const resultMatch = line.match(RESULT_LINE_RE);
    if (resultMatch) {
      evaluationResult = resultMatch[1].toLowerCase();
    } else if (!evaluationResult && RESULT_RE.test(line) && /評価|Evaluation|Regression/i.test(line)) {
      const m = line.match(RESULT_RE);
      if (m) evaluationResult = m[1].toLowerCase();
    }

    const evidenceMatch = line.match(EVIDENCE_LINE_RE);
    if (evidenceMatch) {
      evidenceNotes.push(evidenceMatch[1].trim());
    }

    const blockerMatch = line.match(OBSERVE_BLOCKER_LINE_RE);
    if (blockerMatch) {
      observeBlockersRaw = blockerMatch[1].trim();
    }

    for (const pathMatch of line.matchAll(PATH_RE)) {
      evidencePaths.push(pathMatch[1]);
      if (inObserveSection) {
        observePaths.push(pathMatch[1]);
      }
      if (inEdgeSection) {
        edgePaths.push(pathMatch[1]);
      }
      if (inAiSection) {
        aiPaths.push(pathMatch[1]);
      }
    }

    if (inObserveSection) {
      const kindMatch = line.match(OBSERVE_KIND_RE);
      if (kindMatch) {
        observeKind = kindMatch[1].toLowerCase();
      }

      const pathLineMatch = line.match(OBSERVE_PATH_LINE_RE);
      if (pathLineMatch) {
        const raw = pathLineMatch[1].trim().replace(/^`|`$/g, '');
        if (isMeaningful(raw)) {
          observePaths.push(raw);
        }
      }

      const readMatch = line.match(OBSERVE_READ_RE);
      if (readMatch) {
        observeReadConfirmed = true;
        const note = String(readMatch[2] ?? '')
          .replace(/^[（(]\s*/, '')
          .replace(/[）)]\s*$/, '')
          .trim();
        if (isMeaningful(note)) {
          observeReadNote = note;
        }
      }
    }

    const identityMatch = line.match(/(?:参照の正体)\s*[:：]\s*(.+)/i);
    if (identityMatch) {
      referenceIdentity = stripPathTicks(identityMatch[1]);
    }
    const targetMatch = line.match(/(?:対象枠)\s*[:：]\s*(.+)/i);
    if (targetMatch) {
      targetChrome = stripPathTicks(targetMatch[1]);
    }
    const allowMatch = line.match(/(?:借りてよい)\s*[:：]\s*(.+)/i);
    if (allowMatch) {
      borrowAllow = stripPathTicks(allowMatch[1]);
    }
    const denyMatch = line.match(/(?:借りない)\s*[:：]\s*(.+)/i);
    if (denyMatch) {
      borrowDeny = stripPathTicks(denyMatch[1]);
    }

    if (inChromeSection) {
      const refMatch = line.match(/(?:見本|reference)\s*[:：]\s*(.+)/i);
      if (refMatch) {
        chromeReference = stripPathTicks(refMatch[1]);
      }

      const implMatch = line.match(/(?:実装|implementation)\s*[:：]\s*(.+)/i);
      if (implMatch) {
        const raw = stripPathTicks(implMatch[1]);
        if (isMeaningful(raw)) {
          chromeImplementationPaths.push(raw);
        }
        for (const pathMatch of implMatch[1].matchAll(PATH_RE)) {
          chromeImplementationPaths.push(pathMatch[1]);
        }
      }

      const diffMatch = line.match(/(?:差分|diff)\s*[:：]\s*(.+)/i);
      if (diffMatch && isConfirmedNote(diffMatch[1])) {
        chromeDiff = diffMatch[1].trim();
      }

      const chromeReadMatch = line.match(OBSERVE_READ_RE);
      if (chromeReadMatch) {
        chromeReadConfirmed = true;
        const note = String(chromeReadMatch[2] ?? '')
          .replace(/^[（(]\s*/, '')
          .replace(/[）)]\s*$/, '')
          .trim();
        if (!chromeDiff && isConfirmedNote(note)) {
          chromeDiff = note;
        }
      }
    }

    if (inEdgeSection) {
      const edgeTargetMatch = line.match(/(?:対象)\s*[:：]\s*(.+)/i);
      if (edgeTargetMatch) {
        edgeTarget = stripPathTicks(edgeTargetMatch[1]);
      }

      const kindMatch = line.match(OBSERVE_KIND_RE);
      if (kindMatch) {
        edgeKind = kindMatch[1].toLowerCase();
      }

      const pathLineMatch = line.match(OBSERVE_PATH_LINE_RE);
      if (pathLineMatch) {
        const raw = pathLineMatch[1].trim().replace(/^`|`$/g, '');
        if (isMeaningful(raw)) {
          edgePaths.push(raw);
        }
      }

      const readMatch = line.match(OBSERVE_READ_RE);
      if (readMatch) {
        edgeReadConfirmed = true;
        const note = String(readMatch[2] ?? '')
          .replace(/^[（(]\s*/, '')
          .replace(/[）)]\s*$/, '')
          .trim();
        if (isMeaningful(note)) {
          edgeReadNote = note;
        }
      }
    }

    if (inAiSection) {
      const aiTargetMatch = line.match(/(?:対象)\s*[:：]\s*(.+)/i);
      if (aiTargetMatch) {
        aiTarget = stripPathTicks(aiTargetMatch[1]);
      }

      const kindMatch = line.match(OBSERVE_KIND_RE);
      if (kindMatch) {
        aiKind = kindMatch[1].toLowerCase();
      }

      const pathLineMatch = line.match(OBSERVE_PATH_LINE_RE);
      if (pathLineMatch) {
        const raw = pathLineMatch[1].trim().replace(/^`|`$/g, '');
        if (isMeaningful(raw)) {
          aiPaths.push(raw);
        }
      }

      const readMatch = line.match(OBSERVE_READ_RE);
      if (readMatch) {
        aiReadConfirmed = true;
        const note = String(readMatch[2] ?? '')
          .replace(/^[（(]\s*/, '')
          .replace(/[）)]\s*$/, '')
          .trim();
        if (isMeaningful(note)) {
          aiReadNote = note;
        }
      }
    }
  }

  // Evaluation コマンド行の pnpm は「実行した」記録にはなるが、根拠リンク充足には使わない
  const hasPnpmCommand = Boolean(evaluationCommand && PNPM_RE.test(evaluationCommand));
  const hasMemoryRef =
    MEMORY_REF_RE.test(source) || evidenceNotes.some((note) => MEMORY_REF_RE.test(note));
  const hasEvidenceNote = evidenceNotes.some(
    (note) => note && note !== '…' && note !== '...' && note !== 'なし' && note.length > 1,
  );
  const uniqueObservePaths = [...new Set(observePaths.filter((path) => isMeaningful(path)))];
  const hasObserveEvidence = Boolean(
    observeKind && uniqueObservePaths.length > 0 && observeReadConfirmed && isMeaningful(observeReadNote),
  );
  const uniqueChromeImplPaths = [
    ...new Set(chromeImplementationPaths.filter((path) => isMeaningful(path))),
  ];
  const hasChromeReference = chromeReference != null && (isMeaningful(chromeReference) || isNoneLike(chromeReference));
  const hasChromeCompare = Boolean(
    hasChromeReference &&
      uniqueChromeImplPaths.length > 0 &&
      isConfirmedNote(chromeDiff) &&
      chromeReadConfirmed,
  );
  const hasBorrowContract = Boolean(
    (isMeaningful(referenceIdentity) || isNoneLike(referenceIdentity)) &&
      isMeaningful(targetChrome) &&
      /ロック|変更承認/.test(String(targetChrome)) &&
      (isMeaningful(borrowAllow) || isNoneLike(borrowAllow)) &&
      isMeaningful(borrowDeny),
  );
  const uniqueEdgePaths = [...new Set(edgePaths.filter((path) => isMeaningful(path)))];
  const hasEdgeOverlayObserve = Boolean(
    isEdgeSkip(edgeTarget) ||
      (isMeaningful(edgeTarget) &&
        edgeKind &&
        uniqueEdgePaths.length > 0 &&
        edgeReadConfirmed &&
        isMeaningful(edgeReadNote)),
  );
  const uniqueAiPaths = [...new Set(aiPaths.filter((path) => isMeaningful(path)))];
  const aiProcessingSkip = isAiProcessingSkip(aiTarget);
  const hasAiProcessingObserve = Boolean(
    aiProcessingSkip ||
      (isMeaningful(aiTarget) &&
        aiKind &&
        uniqueAiPaths.length > 0 &&
        aiReadConfirmed &&
        isMeaningful(aiReadNote)),
  );
  const blockersText = String(observeBlockersRaw ?? '').trim();
  const hasObserveBlockersField = Boolean(
    observeBlockersRaw != null && blockersText && blockersText !== '…' && blockersText !== '...',
  );
  const observeHasUnresolvedProblems = hasUnresolvedObserveProblems(
    [observeReadNote, chromeDiff, edgeReadNote, aiReadNote].filter(Boolean).join(' '),
  );
  const hasObserveBlockersCleared = Boolean(
    hasObserveBlockersField &&
      isObserveBlockersCleared(observeBlockersRaw) &&
      !observeHasUnresolvedProblems,
  );

  return {
    evaluationCommand,
    evaluationResult,
    evidencePaths: [...new Set(evidencePaths)],
    evidenceNotes,
    observeKind,
    observePaths: uniqueObservePaths,
    observeReadConfirmed,
    observeReadNote,
    hasObserveEvidence,
    chromeReference,
    chromeImplementationPaths: uniqueChromeImplPaths,
    chromeDiff,
    chromeReadConfirmed,
    hasChromeCompare,
    referenceIdentity,
    targetChrome,
    borrowAllow,
    borrowDeny,
    hasBorrowContract,
    edgeTarget,
    edgeKind,
    edgePaths: uniqueEdgePaths,
    edgeReadConfirmed,
    edgeReadNote,
    hasEdgeOverlayObserve,
    aiTarget,
    aiKind,
    aiPaths: uniqueAiPaths,
    aiReadConfirmed,
    aiReadNote,
    isAiProcessingSkip: aiProcessingSkip,
    hasAiProcessingObserve,
    observeBlockersRaw,
    hasObserveBlockersField,
    observeHasUnresolvedProblems,
    hasObserveBlockersCleared,
    hasEvaluationCommand: Boolean(
      (evaluationCommand && evaluationCommand.length > 1 && evaluationCommand !== '…') || hasPnpmCommand,
    ),
    hasEvaluationResult: Boolean(evaluationResult),
    // 根拠 = 明示ノート / パス / MEMORY 参照（評価コマンド自体は根拠に数えない）
    hasEvidenceLink: hasEvidenceNote || evidencePaths.length > 0 || hasMemoryRef,
    hasPnpmCommand,
    hasMemoryRef,
  };
}

/**
 * 根拠パスが「存在する」「変更面に含まれる」かを見る。
 */
export function resolveEvidencePaths(paths, { changedFiles = [], cwdExists = existsSync } = {}) {
  return (paths ?? []).map((filePath) => {
    const inChanged = changedFiles.includes(filePath);
    const onDisk = cwdExists(filePath);
    return {
      path: filePath,
      inChanged,
      onDisk,
      ok: inChanged || onDisk,
    };
  });
}

/**
 * UI Polish 完成ゲートが観察証拠を要求するか。
 * @param {{ goal?: string | null, declarationText?: string }} input
 */
export function requiresObserveEvidence({ goal = null, declarationText = '' } = {}) {
  const normalizedGoal = String(goal ?? '')
    .trim()
    .toLowerCase();
  if (normalizedGoal === 'ui-polish') return true;
  return /UI Polish Loop/i.test(String(declarationText ?? ''));
}

/**
 * UI Polish 完成ゲートがページ枠照合を要求するか。
 * 観察証拠と同じ条件（ui-polish goal または宣言見出し）。
 * @param {{ goal?: string | null, declarationText?: string }} input
 */
export function requiresChromeCompare(input = {}) {
  return requiresObserveEvidence(input);
}

/**
 * UI Polish 完成ゲートが借り契約を要求するか。
 * 観察証拠と同じ条件（ui-polish goal または宣言見出し）。
 * @param {{ goal?: string | null, declarationText?: string }} input
 */
export function requiresBorrowContract(input = {}) {
  return requiresObserveEvidence(input);
}

/**
 * UI Polish 完成ゲートが端の開閉観察を要求するか。
 * 観察証拠と同じ条件（ui-polish goal または宣言見出し）。
 * @param {{ goal?: string | null, declarationText?: string }} input
 */
export function requiresEdgeOverlayObserve(input = {}) {
  return requiresObserveEvidence(input);
}

/**
 * UI Polish 完成ゲートが AI処理観察を要求するか。
 * 観察証拠と同じ条件（ui-polish goal または宣言見出し）。
 * @param {{ goal?: string | null, declarationText?: string }} input
 */
export function requiresAiProcessingObserve(input = {}) {
  return requiresObserveEvidence(input);
}

/**
 * 完成宣言の主張を根拠に照合する。
 *
 * @returns {{
 *   status: 'skip' | 'pass' | 'warn' | 'stop',
 *   reason: string,
 *   nextAction: string | null,
 *   parsed: object | null,
 *   missing: string[],
 *   evidenceResolution: object[],
 * }}
 */
export function evaluateClaimGrounding({
  declarationPath = DEFAULT_DECLARATION_PATH,
  declarationText = null,
  changedFiles = [],
  requireEvidencePathOnDisk = false,
  goal = null,
} = {}) {
  let text = declarationText;
  if (text == null) {
    if (!existsSync(declarationPath)) {
      return {
        status: 'skip',
        reason: `完成宣言ファイルなし（${declarationPath}）。Claim Grounding は skip。`,
        nextAction: null,
        parsed: null,
        missing: [],
        evidenceResolution: [],
      };
    }
    text = readFileSync(declarationPath, 'utf8');
  }

  if (!String(text).trim()) {
    return {
      status: 'stop',
      reason: '完成宣言ファイルが空です。自己申告完了は無効です。',
      nextAction: '完成宣言フォーマットで Evaluation・根拠を記入してください。',
      parsed: null,
      missing: ['empty-declaration'],
      evidenceResolution: [],
    };
  }

  if (!/完成宣言|回帰ガード通過宣言|LOOP_COMPLETE/i.test(text)) {
    return {
      status: 'warn',
      reason: '完成宣言見出しが見つかりません。フォーマットを確認してください。',
      nextAction: 'loops/goals/* の完成宣言テンプレートに合わせて書き直してください。',
      parsed: parseCompletionDeclaration(text),
      missing: ['declaration-heading'],
      evidenceResolution: [],
    };
  }

  const parsed = parseCompletionDeclaration(text);
  const missing = [];

  if (!parsed.hasEvaluationCommand) {
    missing.push('evaluation-command');
  }
  if (!parsed.hasEvaluationResult) {
    missing.push('evaluation-result');
  }
  if (!parsed.hasEvidenceLink) {
    missing.push('evidence-link');
  }

  const needsObserve = requiresObserveEvidence({ goal, declarationText: text });
  const needsChrome = requiresChromeCompare({ goal, declarationText: text });
  const needsBorrow = requiresBorrowContract({ goal, declarationText: text });
  const needsEdge = requiresEdgeOverlayObserve({ goal, declarationText: text });
  const needsAi = requiresAiProcessingObserve({ goal, declarationText: text });
  if (needsObserve && !parsed.hasObserveEvidence) {
    missing.push('observe-evidence');
  }
  if (needsChrome && !parsed.hasChromeCompare) {
    missing.push('observe-chrome');
  }
  if (needsBorrow && !parsed.hasBorrowContract) {
    missing.push('borrow-inventory');
  }
  if (needsEdge && !parsed.hasEdgeOverlayObserve) {
    missing.push('observe-edge');
  }
  if (needsAi && !parsed.hasAiProcessingObserve) {
    missing.push('observe-ai-processing');
  } else if (needsAi && parsed.isAiProcessingSkip && touchesAiProcessingUi(changedFiles)) {
    missing.push('observe-ai-processing');
  }
  if (needsObserve && parsed.hasObserveEvidence && !parsed.hasObserveBlockersCleared) {
    missing.push('observe-blockers-cleared');
  }

  const evidenceResolution = resolveEvidencePaths(parsed.evidencePaths, { changedFiles });
  const badPaths = evidenceResolution.filter((item) => !item.ok);
  if (requireEvidencePathOnDisk && badPaths.length > 0) {
    missing.push('evidence-path-missing');
  } else if (badPaths.length > 0 && parsed.evidencePaths.length > 0 && !parsed.hasMemoryRef && !parsed.hasPnpmCommand) {
    // パスを書いたのにどれも解決できない場合は警告
    missing.push('evidence-path-unresolved');
  }

  if (missing.includes('evaluation-command') || missing.includes('evaluation-result')) {
    return {
      status: 'stop',
      reason: '完成宣言に Evaluation のコマンドまたは結果がありません（Claim Grounding）。',
      nextAction: 'Evaluation に実行コマンドと pass/warn/stop を明記してください。',
      parsed,
      missing,
      evidenceResolution,
    };
  }

  if (missing.includes('observe-evidence')) {
    return {
      status: 'stop',
      reason:
        'UI Polish 完成宣言に観察証拠がありません（Observe Loop: キャプチャ／snapshot を Read するまで完成にしない）。',
      nextAction:
        '観察証拠に 種別（snapshot|screenshot）・パス・Read済み: はい（差分1行） を記入してください。',
      parsed,
      missing,
      evidenceResolution,
    };
  }

  if (missing.includes('observe-chrome')) {
    return {
      status: 'stop',
      reason:
        'UI Polish 完成宣言にページ枠照合がありません（見本キャプチャと実装キャプチャのペアを Read するまで完成にしない）。',
      nextAction:
        'ページ枠照合に 見本（path または なし）・実装（ページ全体）・差分（sidebar/header/FAB 等）・Read済み: はい を記入してください。内側パネルだけのスクショは不可です。',
      parsed,
      missing,
      evidenceResolution,
    };
  }

  if (missing.includes('borrow-inventory')) {
    return {
      status: 'stop',
      reason:
        'UI Polish 完成宣言に借り契約がありません（参照の正体・対象枠ロック・借りてよい/借りないを書くまで完成にしない）。',
      nextAction:
        '参照の正体（Nani!? 等。Cursor Cloud と決めつけない）・対象枠（ロック または 変更承認）・借りてよい・借りない を記入してください。',
      parsed,
      missing,
      evidenceResolution,
    };
  }

  if (missing.includes('observe-edge')) {
    return {
      status: 'stop',
      reason:
        'UI Polish 完成宣言に操作観察がありません（端の開閉を動かして見切れ・固定枠のガクつきを確認するまで完成にしない）。',
      nextAction:
        '操作観察に 対象（下端▼等、または なし（端の開閉なし））・種別・パス・Read済み: はい（見切れなし／固定枠は動かない） を記入してください。',
      parsed,
      missing,
      evidenceResolution,
    };
  }

  if (missing.includes('observe-ai-processing')) {
    return {
      status: 'stop',
      reason:
        'UI Polish 完成宣言に AI処理観察がありません（裏でAIを動かすボタンは実行中の Composing を観察するまで完成にしない）。',
      nextAction:
        'AI処理観察に 対象（実行中、または なし（AI処理なし））・種別・パス・Read済み: はい を記入してください。ComposingOrb 等を触った差分で「AI処理なし」は不可です。ログインやCSVの処理中は対象外です。',
      parsed,
      missing,
      evidenceResolution,
    };
  }

  if (missing.includes('observe-blockers-cleared')) {
    return {
      status: 'stop',
      reason:
        '観察で見出し重複・説明重複・FAB衝突などの阻害が残っている、または「観察で残した阻害: なし」が無い。',
      nextAction:
        '阻害を直してから再観察する。完成時は「観察で残した阻害: なし」。Read差分に未解消の重複・重なりを残したまま なし と書かない。',
      parsed,
      missing,
      evidenceResolution,
    };
  }

  if (missing.includes('evidence-link') || missing.includes('evidence-path-unresolved')) {
    return {
      status: 'warn',
      reason: '完成宣言の根拠リンクが不足しています（Claim Grounding）。',
      nextAction:
        'Stop非該当の根拠、`パス`、PROJECT_MEMORY 節、または実行コマンドへの根拠を完成宣言に追加してください。',
      parsed,
      missing,
      evidenceResolution,
    };
  }

  return {
    status: 'pass',
    reason: needsObserve
      ? '完成宣言の主張は観察証拠・ページ枠照合・操作観察・AI処理観察・根拠リンク・Evaluation 結果にグラウンディングされています。'
      : '完成宣言の主張は根拠リンクと Evaluation 結果にグラウンディングされています。',
    nextAction: null,
    parsed,
    missing: [],
    evidenceResolution,
  };
}
