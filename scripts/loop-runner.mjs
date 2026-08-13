#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const args = process.argv.slice(2);
const modeArg = args.find((arg) => arg.startsWith('--mode='));
const mode = modeArg ? modeArg.split('=')[1] : 'main-safe';
const goalArg = args.find((arg) => arg.startsWith('--goal='));
const goal = goalArg ? goalArg.split('=')[1] : 'main-doctor';
const withRegressionGuard =
  args.includes('--with-regression-guard') || goal === 'bug-fix' || goal === 'ssot-debt' || goal === 'ui-polish';

function runJson(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    shell: false,
  });
  try {
    return {
      status: result.status ?? 1,
      json: JSON.parse(result.stdout),
      stdout: result.stdout,
      stderr: result.stderr,
    };
  } catch {
    return {
      status: result.status ?? 1,
      json: null,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  }
}

function printBugFixGuide({ evaluation }) {
  console.log('');
  console.log('bug fix loop:');
  console.log('- お客さんの問題文を一次情報として扱う');
  console.log('- 期待値の根拠を PROJECT_MEMORY / 実画面 / DB / ユーザー報告で確認する');
  console.log('- 再現条件、影響画面、関係するDB/API/SSoTを整理する');
  console.log('- 可能なら修正前に再現テストまたは再現手順を作る');
  console.log('- Hard Boundary に触れる場合は自動修正を止めて確認する');
  console.log('- 完成ゲート: 「修正した」だけでは完成にしない（loops/goals/bug-fix.md）');
  console.log('- 判定が stop / 完成条件未達なら差し戻し（完成報告禁止）。maxIterations=3');
  console.log('- 完成時は「完成宣言」フォーマット必須（iteration・チェックリスト・Evaluation結果）');
  console.log('- 完成宣言は state/completion-declaration.md に書き、Claim Grounding を通す');
  console.log('- 画面/API/テーブル/症状は pnpm run working-graph で薄い共有メモリへ残してよい');
  console.log('- 図: loops/graphs/bug-fix.mmd');

  if ((evaluation.changedFiles ?? []).length === 0) {
    console.log('- まだ差分がないため、まず原因調査と再現条件の整理から開始する');
  }

  const decisionStatus = evaluation.decision?.status;
  if (decisionStatus === 'stop') {
    console.log('- 現在の判定: stop → 完成報告禁止。人間確認または差し戻し条件を確認する');
  } else if (decisionStatus === 'warn') {
    console.log('- 現在の判定: warn → 根拠を Evidence Map に残してから続行可否を判断する');
  }
}

function printRegressionGuard({ evaluation }) {
  console.log('');
  console.log('regression guard:');
  console.log('- 図: loops/graphs/regression-guard.mmd');
  console.log('- 「直ったはず」の自己申告は完成ではない。判定ノードが pass/説明可能な warn になるまで完成にしない');
  console.log('- maxIterations=2（差し戻し上限）。到達または No progress なら人間確認');
  console.log('- pnpm run loop:run');
  console.log('- pnpm run test:changed');
  console.log('- pnpm run loop:evaluate / loop:evaluator');

  const commands = new Set(evaluation.recommendedCommands ?? []);
  for (const command of commands) {
    console.log(`- ${command}`);
  }

  const touchesCore = (evaluation.changedFiles ?? []).some(
    (file) =>
      file.startsWith('src/pages/') ||
      file.startsWith('src/features/') ||
      file.startsWith('src/utils/') ||
      file.startsWith('src/lib/') ||
      file.startsWith('api/') ||
      file.startsWith('supabase/'),
  );

  if (touchesCore) {
    console.log('- pnpm run check:provenance');
    if (existsSync('src/__invariants__')) {
      console.log('- pnpm exec vitest run src/__invariants__');
    } else {
      console.log('- src/__invariants__ は存在しないため、不変条件テストは省略理由を報告する');
    }
  }
}

function printSsotDebtGuide() {
  const result = runJson('node', ['scripts/ssot-debt-report.mjs', '--json']);
  const report = result.json;

  console.log('');
  console.log('ssot debt hunter:');

  if (!report) {
    console.log('- SSoT debt report を解析できませんでした。pnpm run ssot:debt を直接確認してください。');
    return;
  }

  console.log(`- total: ${report.summary.total}`);
  console.log(`- errors: ${report.summary.errors}`);
  console.log(`- warnings: ${report.summary.warnings}`);

  console.log('');
  console.log('priority areas:');
  if (report.summary.priority.length === 0) {
    console.log('- なし');
  } else {
    for (const area of report.summary.priority) {
      console.log(`- ${area.area}: total=${area.total}, error=${area.errors}, warn=${area.warnings}`);
    }
  }

  console.log('');
  console.log('recommended first targets:');
  for (const violation of report.violations.slice(0, 5)) {
    console.log(`- ${violation.file}:${violation.line} [${violation.patternId}] ${violation.severity}`);
  }

  console.log('');
  console.log('ssot debt rules:');
  console.log('- 1回の修正対象は1領域に限定する');
  console.log('- SSoT関数のシグネチャや戻り値は変えない');
  console.log('- 修正後は check:ssot / check:provenance / src/__invariants__（存在する場合）を確認する');
  console.log('- 業務判断や期待値変更が必要なら停止する');
}

function printUiPolishGuide({ evaluation }) {
  console.log('');
  console.log('ui polish loop:');
  console.log('- 機械ゲート: loops/goals/ui-polish-gate.md（ページ枠照合が無い完成は stop）');
  console.log('- コードを書く前に、添付画像からページ枠・negative inventory・構造・余白・色・重心・視線誘導を抽出する');
  console.log('- ユーザーが何を良いと感じているか、意図と文脈を言語化する');
  console.log('- 画面種別: 業務UI / HP-LP / 文書シェル（専用ページ枠）');
  console.log('- 業務UIなら ui-design.mdc / ui-language.mdc を優先する。原子（Button/Modal）は再利用し、ページ枠は見本に合わせる');
  console.log('- HP/LPなら ui-design-hp-lp.mdc を参照する');
  console.log('- 見本が専用シェルなら対象画面を DashboardLayout で包んだまま完成にしない');
  console.log('- 見本画像の再現とプロジェクト禁止事項が衝突する場合は停止して確認する');
  console.log('- 完成ゲート: 「実装した」だけでは完成にしない（loops/goals/ui-polish.md）');
  console.log('- 判定が stop / 完成条件未達なら差し戻し（完成報告禁止）。maxIterations=3');
  console.log('- Iteration順: ページ枠 → 面の階層 → タイポ → 主ボタン → 余白・見切れ');
  console.log('- 観察: 見本キャプチャと実装キャプチャ（ページ全体）のペア。内側パネルだけは完成無効');
  console.log('- 判定ノードで Interface Review: /better-interface quick|full（.cursor/skills/better-interface）');
  console.log('- UI細部レシピ: .cursor/skills/better-ui（同心円角丸・optical・motion restraint）');
  console.log('- 図: loops/graphs/ui-polish.mmd');

  console.log('');
  console.log('completion criteria:');
  console.log('- ページ枠が見本と一致している（見本に無い業務枠が残っていない）');
  console.log('- 主要操作や主情報が1秒で分かる');
  console.log('- 見本画像と同じ余白・重心・視線誘導になっている');
  console.log('- モバイル/PCで見切れや横スクロール事故がない');
  console.log('- 画像やキャラクターの重要要素が見えている');
  console.log('- 日本語文言だけで意味が伝わる');
  console.log('- 禁止アイコンライブラリや装飾英語を追加していない');
  console.log('- Interface Review の Verdict が Block でない（完成宣言に mode/Verdict/Findings を書く）');

  if ((evaluation.changedFiles ?? []).length === 0) {
    console.log('- まだ差分がないため、まず理想画像の抽出と完成判定を提示する');
  }
}

function printMainSafe({ evaluation, context, discovery, evaluator }) {
  const decision = evaluation.decision ?? {
    status: 'stop',
    reason: '評価結果がありません。',
    nextAction: 'pnpm run loop:evaluate を確認してください。',
  };

  const title =
    goal === 'bug-fix'
      ? 'Bug Fix Loop'
      : goal === 'ssot-debt'
        ? 'SSoT Debt Hunter Loop'
        : goal === 'ui-polish'
          ? 'UI Polish Loop'
          : 'Main Doctor Loop';
  console.log(`[loop:run] ${title}`);
  console.log(`mode: ${mode}`);
  console.log(`goal: ${goal}`);
  console.log(`status: ${decision.status}`);
  console.log(`reason: ${decision.reason}`);
  console.log(`next: ${decision.nextAction}`);
  console.log('');

  const findings = discovery?.findings ?? [];
  console.log('loop discovery:');
  if (findings.length === 0) {
    console.log('- 発見事項なし');
  } else {
    for (const finding of findings.slice(0, 8)) {
      console.log(`- ${finding.severity.toUpperCase()} [${finding.type}] ${finding.title}`);
    }
    if (findings.length > 8) {
      console.log(`- 他 ${findings.length - 8} 件`);
    }
  }

  console.log('');
  const evaluatorVerdict = evaluator?.verdict;
  console.log('independent evaluator:');
  if (!evaluatorVerdict) {
    console.log('- 評価結果なし');
  } else {
    console.log(`- status: ${evaluatorVerdict.status}`);
    console.log(`- reason: ${evaluatorVerdict.reason}`);
  }

  console.log('');
  console.log('changed files:');
  const changedFiles = evaluation.changedFiles ?? context.changedFiles ?? [];
  if (changedFiles.length === 0) {
    console.log('- なし');
  } else {
    for (const file of changedFiles) {
      console.log(`- ${file}`);
    }
  }

  console.log('');
  console.log('recommended commands:');
  const commands = evaluation.recommendedCommands ?? [];
  if (commands.length === 0) {
    console.log('- なし');
  } else {
    for (const command of commands) {
      console.log(`- ${command}`);
    }
  }

  if (goal === 'bug-fix') {
    printBugFixGuide({ evaluation });
  }

  if (goal === 'ssot-debt') {
    printSsotDebtGuide();
  }

  if (goal === 'ui-polish') {
    printUiPolishGuide({ evaluation });
  }

  if (withRegressionGuard) {
    printRegressionGuard({ evaluation });
  }

  const isolationFindings = findings.filter((finding) => finding.type === 'isolation');
  if (isolationFindings.length > 0) {
    console.log('');
    console.log('isolation guidance (Phase E):');
    for (const finding of isolationFindings) {
      console.log(`- ${finding.severity.toUpperCase()} ${finding.title}`);
      console.log(`  ${finding.nextAction}`);
    }
    console.log('- 詳細: pnpm run isolate:status');
  }

  console.log('');
  if (decision.status === 'stop') {
    console.log('result: 自動続行せず、人間確認が必要です。');
    process.exit(1);
  }

  if (evaluatorVerdict?.status === 'stop') {
    console.log('result: 独立評価役が停止を要求しました。');
    process.exit(1);
  }

  if (evaluatorVerdict?.status === 'warn') {
    console.log('result: 続行可能ですが、独立評価役の警告を Evidence Map に残してください。');
    return;
  }

  if (decision.status === 'warn') {
    console.log('result: 続行可能ですが、警告の根拠を Evidence Map に残してください。');
    return;
  }

  console.log('result: main-safe 評価は通過しました。');
}

function main() {
  if (mode !== 'main-safe') {
    console.error(`[loop:run] 未対応モードです: ${mode}`);
    console.error('現在は --mode=main-safe のみ対応しています。');
    process.exit(1);
  }

  if (!['main-doctor', 'bug-fix', 'ssot-debt', 'ui-polish'].includes(goal)) {
    console.error(`[loop:run] 未対応goalです: ${goal}`);
    console.error('現在は --goal=main-doctor / --goal=bug-fix / --goal=ssot-debt / --goal=ui-polish に対応しています。');
    process.exit(1);
  }

  const evaluationResult = runJson('node', ['scripts/loop-evaluate.mjs', '--json']);
  const contextResult = runJson('node', ['scripts/loop-context.mjs', '--json', `--goal=${goal}`]);
  const discoveryResult = runJson('node', ['scripts/loop-discover.mjs', '--json']);
  // 進捗記録はこの1回だけ（context 側は --no-record）
  const evaluatorResult = runJson('node', ['scripts/loop-evaluator.mjs', '--json']);

  if (!evaluationResult.json) {
    console.error('[loop:run] loop-evaluate のJSON出力を解析できませんでした。');
    console.error(evaluationResult.stderr || evaluationResult.stdout);
    process.exit(1);
  }

  printMainSafe({
    evaluation: evaluationResult.json,
    context: contextResult.json ?? {},
    discovery: discoveryResult.json ?? {},
    evaluator: evaluatorResult.json ?? {},
  });
}

main();
