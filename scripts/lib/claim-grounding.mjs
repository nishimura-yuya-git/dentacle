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
 * 加えて骨格照合（借りる / 借りない）が無いと stop。
 * 見本が http(s) URL なのに見本が「なし」または URL 文字列のままだと stop。
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
const HTTP_URL_RE = /^https?:\/\//i;

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
 * ライブページの URL か。キャプチャパスとしては使えない。
 * @param {string} value
 */
export function isHttpUrl(value) {
  return HTTP_URL_RE.test(stripPathTicks(value));
}

/**
 * ページ全体スクショ等のキャプチャパスか。URL や「なし」は不可。
 * @param {string} value
 */
export function isCapturePath(value) {
  if (value == null) return false;
  const text = stripPathTicks(value);
  if (!isMeaningful(text) || isNoneLike(text) || isHttpUrl(text)) return false;
  return true;
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
  let inBorrowSection = false;
  let chromeReference = null;
  const chromeImplementationPaths = [];
  let chromeDiff = '';
  let chromeReadConfirmed = false;
  let borrowUrl = null;
  let borrowKeep = '';
  let borrowSkip = '';
  let borrowReadConfirmed = false;

  for (const line of lines) {
    if (/骨格照合|borrow[-_ ]?copy|borrow\s*copy/i.test(line)) {
      inBorrowSection = true;
      inChromeSection = false;
      inObserveSection = false;
    } else if (/ページ枠照合|chrome\s*compare/i.test(line)) {
      inChromeSection = true;
      inObserveSection = false;
      inBorrowSection = false;
    } else if (/観察証拠|Observe\s*evidence/i.test(line)) {
      inObserveSection = true;
      inChromeSection = false;
      inBorrowSection = false;
    } else if (/^\s*#{1,6}\s+/.test(line)) {
      inObserveSection = false;
      inChromeSection = false;
      inBorrowSection = false;
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

    for (const pathMatch of line.matchAll(PATH_RE)) {
      evidencePaths.push(pathMatch[1]);
      if (inObserveSection) {
        observePaths.push(pathMatch[1]);
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

    if (inChromeSection) {
      const refMatch = line.match(/(?:見本(?!URL)|reference)\s*[:：]\s*(.+)/i);
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

    if (inBorrowSection) {
      const urlMatch = line.match(/(?:見本URL|reference\s*URL|source\s*URL)\s*[:：]\s*(.+)/i);
      if (urlMatch) {
        borrowUrl = stripPathTicks(urlMatch[1]);
      }

      const skipMatch = line.match(/(?:借りない|do not borrow|skip)\s*[:：]\s*(.+)/i);
      if (skipMatch && isMeaningful(skipMatch[1])) {
        borrowSkip = skipMatch[1].trim();
      }

      const keepMatch = line.match(/(?:借りる|borrow|keep)\s*[:：]\s*(.+)/i);
      if (keepMatch && isMeaningful(keepMatch[1]) && !/借りない/.test(line)) {
        borrowKeep = keepMatch[1].trim();
      }

      const borrowReadMatch = line.match(OBSERVE_READ_RE);
      if (borrowReadMatch) {
        borrowReadConfirmed = true;
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
  const hasChromeReference =
    chromeReference != null && (isCapturePath(chromeReference) || isNoneLike(chromeReference));
  const hasChromeCompare = Boolean(
    hasChromeReference &&
      uniqueChromeImplPaths.length > 0 &&
      isConfirmedNote(chromeDiff) &&
      chromeReadConfirmed,
  );
  const hasBorrowUrl = borrowUrl != null && (isMeaningful(borrowUrl) || isNoneLike(borrowUrl));
  const hasBorrowCopy = Boolean(
    hasBorrowUrl && isMeaningful(borrowKeep) && isMeaningful(borrowSkip) && borrowReadConfirmed,
  );
  const hasLiveReferenceUrl = isHttpUrl(borrowUrl) || isHttpUrl(chromeReference);
  const hasReferenceCapture = isCapturePath(chromeReference);
  const hasValidReferenceShot = !hasLiveReferenceUrl || hasReferenceCapture;

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
    borrowUrl,
    borrowKeep,
    borrowSkip,
    borrowReadConfirmed,
    hasBorrowCopy,
    hasLiveReferenceUrl,
    hasReferenceCapture,
    hasValidReferenceShot,
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
 * UI Polish 完成ゲートが骨格照合（借りる / 借りない）を要求するか。
 * @param {{ goal?: string | null, declarationText?: string }} input
 */
export function requiresBorrowCopy(input = {}) {
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
  const needsBorrow = requiresBorrowCopy({ goal, declarationText: text });
  if (needsObserve && !parsed.hasObserveEvidence) {
    missing.push('observe-evidence');
  }
  if (needsChrome && !parsed.hasChromeCompare) {
    missing.push('observe-chrome');
  }
  if (needsBorrow && !parsed.hasBorrowCopy) {
    missing.push('observe-borrow');
  }
  if (needsBorrow && parsed.hasLiveReferenceUrl && !parsed.hasReferenceCapture) {
    missing.push('observe-reference-shot');
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

  if (missing.includes('observe-borrow')) {
    return {
      status: 'stop',
      reason:
        'UI Polish 完成宣言に骨格照合がありません（借りる / 借りない を Read するまで完成にしない）。',
      nextAction:
        '骨格照合に 見本URL・借りる（枠・並び・余白）・借りない（色・フォント・事実）・Read済み: はい を記入してください。',
      parsed,
      missing,
      evidenceResolution,
    };
  }

  if (missing.includes('observe-reference-shot')) {
    return {
      status: 'stop',
      reason:
        '見本がライブ URL なのに、見本キャプチャがありません（URL 文字列や「なし（指示のみ）」では寄せない）。',
      nextAction:
        '見本ページを開き、ページ全体スクショを撮って ページ枠照合の見本 に path を書いてください。',
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
      ? '完成宣言の主張は観察証拠・ページ枠照合・骨格照合・根拠リンク・Evaluation 結果にグラウンディングされています。'
      : '完成宣言の主張は根拠リンクと Evaluation 結果にグラウンディングされています。',
    nextAction: null,
    parsed,
    missing: [],
    evidenceResolution,
  };
}
