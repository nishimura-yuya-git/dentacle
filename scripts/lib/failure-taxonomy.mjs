/**
 * 失敗タクソノミ（Future AGI の annotation / failure clustering 思想の薄い版）。
 *
 * stop/warn を原子的な failure class に正規化し、
 * No progress・MEMORY 候補・シミュレーション期待値で共通利用する。
 *
 * 期待値根拠: docs/agent-loop-harness.md §23 / loops/simulations/README.md
 */

export const FAILURE_CLASSES = [
  {
    id: 'hard-boundary',
    label: 'Hard Boundary 侵害',
    matchText: /hard boundary|保護対象|PROJECT_MEMORY|migrations\/|api\//i,
    matchType: /hard[-_]?boundary/i,
  },
  {
    id: 'contract-gate',
    label: '変更契約ゲート違反',
    matchText: /変更契約|contract|whitelist|pending|承認前/i,
    matchType: /contract/i,
  },
  {
    id: 'ssot-debt',
    label: 'SSoT 再実装・負債',
    matchText: /ssot|再実装|Single Source/i,
    matchType: /ssot/i,
  },
  {
    id: 'claim-grounding',
    label: '完成宣言の根拠不足',
    matchText: /claim[-_ ]?grounding|完成宣言|根拠リンク|Evaluation 欠落|観察証拠|Observe Loop/i,
    matchType: /claim[-_]?grounding|observe[-_]?evidence/i,
  },
  {
    id: 'no-progress',
    label: '同じ失敗の繰り返し',
    matchText: /no progress|同じ失敗|同じ警告シグネチャ/i,
    matchType: /no[-_]?progress/i,
  },
  {
    id: 'architecture-boundary',
    label: 'import / アーキテクチャ境界',
    matchText: /import境界|architecture|アーキテクチャ/i,
    matchType: /architecture/i,
  },
  {
    id: 'security-finding',
    label: 'セキュリティ所見',
    matchText: /security|秘匿|secret|危険 API/i,
    matchType: /security/i,
  },
  {
    id: 'eval-template',
    label: 'Eval template 未充足',
    matchText: /eval template|必須 criteria/i,
    matchType: /eval[-_]?template/i,
  },
];

function normalizeHaystack(parts) {
  return parts
    .filter(Boolean)
    .map((part) => String(part))
    .join('\n');
}

/**
 * 単一テキスト / finding を class に分類する。
 * @returns {string}
 */
export function classifyText(text, { type = '' } = {}) {
  const haystack = normalizeHaystack([text, type]);
  for (const entry of FAILURE_CLASSES) {
    if (entry.matchType.test(String(type ?? '')) || entry.matchText.test(haystack)) {
      return entry.id;
    }
  }
  return 'unclassified';
}

/**
 * discovery finding を分類する。
 */
export function classifyFinding(finding = {}) {
  const classId = classifyText(
    normalizeHaystack([finding.title, finding.description, finding.nextAction, finding.type]),
    { type: finding.type },
  );
  return {
    id: classId,
    label: FAILURE_CLASSES.find((item) => item.id === classId)?.label ?? '未分類',
    severity: finding.severity ?? null,
    evidence: finding.title ?? finding.type ?? null,
  };
}

/**
 * evaluator report から primary + classes を作る。
 */
export function classifyEvaluatorReport(report = {}) {
  const classes = [];
  const pushUnique = (entry) => {
    if (!entry?.id) return;
    if (classes.some((item) => item.id === entry.id && item.evidence === entry.evidence)) return;
    classes.push(entry);
  };

  for (const finding of report.discovery?.findings ?? []) {
    if (finding.severity === 'stop' || finding.severity === 'warn') {
      pushUnique(classifyFinding(finding));
    }
  }

  const groundingStatus = report.claimGrounding?.status;
  if (groundingStatus === 'stop' || groundingStatus === 'warn') {
    pushUnique({
      id: 'claim-grounding',
      label: '完成宣言の根拠不足',
      severity: groundingStatus,
      evidence: report.claimGrounding?.reason ?? null,
    });
  }

  if (report.progress?.detection?.noProgress) {
    pushUnique({
      id: 'no-progress',
      label: '同じ失敗の繰り返し',
      severity: report.progress.detection.severity,
      evidence: report.progress.detection.signature,
    });
  }

  if (report.evalTemplate?.status === 'stop' || report.evalTemplate?.status === 'warn') {
    pushUnique({
      id: 'eval-template',
      label: 'Eval template 未充足',
      severity: report.evalTemplate.status,
      evidence: report.evalTemplate.reason,
    });
  }

  const verdictReason = report.verdict?.reason;
  if ((report.verdict?.status === 'stop' || report.verdict?.status === 'warn') && classes.length === 0) {
    pushUnique({
      id: classifyText(verdictReason),
      label:
        FAILURE_CLASSES.find((item) => item.id === classifyText(verdictReason))?.label ?? '未分類',
      severity: report.verdict.status,
      evidence: verdictReason,
    });
  }

  const severityRank = { stop: 2, warn: 1 };
  classes.sort(
    (a, b) => (severityRank[b.severity] ?? 0) - (severityRank[a.severity] ?? 0),
  );

  return {
    primary: classes[0]?.id ?? (report.verdict?.status === 'pass' ? null : 'unclassified'),
    classes,
  };
}

/**
 * シミュレーション期待 class とガード結果を照合する。
 */
export function matchSimulationExpectation({
  expectedPermission,
  actualPermission,
  expectedFailureClass,
  denyReason = '',
} = {}) {
  const permissionOk = expectedPermission === actualPermission;
  const classified = classifyText(denyReason);

  let failureClassOk = true;
  if (actualPermission === 'deny' && expectedFailureClass) {
    failureClassOk =
      classified === expectedFailureClass ||
      (expectedFailureClass === 'hard-boundary' &&
        /hard boundary|保護|boundary|PROJECT_MEMORY|api\//i.test(denyReason)) ||
      (expectedFailureClass === 'contract-gate' &&
        /契約|contract|whitelist|pending|承認/i.test(denyReason));
  }

  return {
    ok: permissionOk && failureClassOk,
    permissionOk,
    failureClassOk,
    classified,
  };
}
