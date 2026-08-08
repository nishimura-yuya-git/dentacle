# Agent Loops

このディレクトリは、AIエージェントが自分で評価しながら作業を進めるためのループ定義を置く場所です。

## 基本方針

このプロジェクトでは、通常作業は main 上で進める運用を前提にします。

ブランチやPRは目的ではなく、隔離・比較・戻しやすさのための安全装置です。ループはユーザーに毎回ブランチ運用を強制せず、まず main 上の現在差分を評価し、危険度が上がった時だけ shadow branch やPR化を提案します。

## ループの4要素

- Goal: 何を達成するか。
- Context: `PROJECT_MEMORY.md`、`.cursor/rules/`、差分、doctor結果、テスト結果など。
- Evaluation: `pnpm run doctor`、`pnpm run test:changed`、必要な単体テストやE2E。
- Agent: 評価結果を見て、続行・停止・人間確認・隔離ブランチ化を判断する実行体。

## ループエンジニアリングの5つの動き

このプロジェクトのループは、単に同じコマンドを再実行するだけではなく、以下の5つを1ターンとして扱います。

- 発見: `pnpm run loop:discover` で、差分・Hard Boundary・SSoT負債・UI変更・ハーネス変更を発見する。
- 受け渡し: 発見事項を goal と対象領域へ分け、必要なら1領域だけに絞る。
- 検証: `pnpm run loop:evaluator` で、生成役とは別の独立評価役が stop / warn / pass を判定する。
- 永続化: 必要な場合のみ `node scripts/loop-discover.mjs --write-state` で `state/loop-findings.json` に状態を残す。
- スケジューリング: 将来的な自動実行でも、上記の発見・検証・永続化を省略しない。

## 生成役と評価役の分離

コードや方針を作るエージェントは、自分の出力を甘く評価しやすいため、評価は別の観点で行います。

- 生成役: 実装、修正、WBS作成、UI調整などを行う。
- 評価役: `loop:evaluator` が「証明されるまで壊れている前提」で、`loop:evaluate` と `loop:discover` と状態ファイルを照合する。
- 評価役が `stop` を返した場合、生成役は自動続行せず、人間確認へ回す。
- 評価役が `warn` を返した場合、警告の根拠を Evidence Map や報告に残す。

## 完成ゲート（Graph の判定ノード）

開発精度を上げるため、外側の遷移は Graph、内側の試行だけ Loop にします。

- 「実装した」は完成ではない。判定ノード（`loop:evaluator` 等）が通るまで完成にしない。
- Harness が “done” と言っても未検証。Completion check が通るまで完成にしない。
- 正式適用:
  - Bug Fix: `loops/goals/bug-fix.md` / `loops/graphs/bug-fix.mmd`（`maxIterations: 3`）
  - UI Polish: `loops/goals/ui-polish.md` / `loops/graphs/ui-polish.mmd`（`maxIterations: 3`）。判定ノードで `/better-interface`（`.cursor/skills/better-interface`）を回す
  - Regression Guard: `loops/goals/regression-guard.md` / `loops/graphs/regression-guard.mmd`（`maxIterations: 2`）
- 各 Graph は差し戻し条件と完成/通過宣言フォーマットを持つ。

## 層と unit of work

| 層 | unit of work | 本プロジェクトの実体 |
|---|---|---|
| Prompt | one input | 理解レポート / 変更契約 / Agent Prompt 定型 |
| Context | what stays in the window | `loop:context` の Context Budget（must / compress / drop） |
| Harness | the machine | Gather → Act → Verify（doctor / evaluate / PreToolUse） |
| Loop | the run | Goal / Evaluation / Stop / maxIterations / No progress |
| Graph | nodes + edges | `loops/graphs/*.mmd`（生成↔判定＋人間確認） |

## No progress ブレーキ

- `loop:evaluator` が評価シグネチャを `state/loop-progress.json` に記録する。
- 同じ失敗（stop）が 2 回連続したら `stop`（自動続行禁止）。
- 同じ警告（warn）が 2 回連続したら `warn`（方針変更を要求）。
- `loop:context` 経由の評価は `--no-record`（二重記録防止）。
- 無効化: `LOOP_PROGRESS_DISABLE=1`

## 薄い知識Graph層

制御 Graph（`loops/graphs/*.mmd`）とは別に、共有メモリとグラウンディングを薄く持つ。

- Claim Grounding: 完成宣言（`state/completion-declaration.md`）の主張を根拠と照合。無ければ skip。
- Working Graph: `SCREEN/API/TABLE/SSOT/SYMPTOM/DOC` と `touches/depends_on/reported_in` を `state/working-graph.json` に残す。
- 全文書 NER・グラフDB・Claude 自動抽出は行わない。
- コマンド: `pnpm run working-graph` / `pnpm run test:claim-grounding` / `pnpm run test:working-graph`

## Quality Loop 思想（製品ではなく型だけ）

[Future AGI](https://github.com/future-agi/future-agi) から借りたのは次の3点だけ。プラットフォーム・SDK・LLM-as-judge は入れない。

| 思想 | 本ハーネスの実体 |
|---|---|
| template → score | `loops/evals/*.json` + `scripts/lib/eval-template.mjs` |
| 失敗の分類 | `scripts/lib/failure-taxonomy.mjs`（evaluator 報告に付与） |
| persona × scenario | `loops/simulations/adversarial-scenarios.json` + `test:harness-simulation` |

```bash
pnpm run test:eval-template
pnpm run test:failure-taxonomy
pnpm run test:harness-simulation
```

品質ループの読み方: Observe（discover）→ Evaluate（evaluator + template）→ Gate（pass/warn/stop）→ 次の修正。

## 仕様密度ゲート（Memory Tighten）

実装ゲートと対になる、**PROJECT_MEMORY の薄さ検知**です。

- `pnpm run memory:audit` — プレースホルダ・空節・根拠リンク不足を検出（自動編集しない）
- `memory:candidates` は「足す」候補、`memory:audit` は「詰める」候補
- `doctor` と `loop:context` に載る（critical は WARN）
- 理解レポート §6 で要詰め件数を書く
- 反映は人間が詰めたあと `/project-memory-learn`
- 打ち合わせ直後は `/project-memory-audit` コマンドを使う

## サブエージェント権限（Phase C）

Task / サブエージェント起動時は `.cursor/subagent-policy.json` と hooks が権限を強制します。

- 調査は `explore`（read-only）を優先する。
- 変更契約が `pending` のあいだ、write 系サブエージェント（`generalPurpose` など）は起動できない。
- Hard Boundary に触れる実装タスクは、親側で変更契約を approve してから行う。
- 詳細は `docs/agent-loop-harness.md` §15.3。

## モード

### main-safe

main 上の未コミット差分を評価します。最初の標準モードです。

- ブランチを切らない。
- 差分を巻き戻さない。
- Hard Boundary に触れたら自動修正を止める。
- 追加で必要な検証を表示する。

### shadow-branch / worktree（Phase E）

長時間ループ、不確実な修正、Hard Boundary、複数案比較、PR化が必要な時だけ使う隔離モードです。

- ユーザーが手動でブランチを切る前提にしない。
- main の未コミット差分を勝手に破壊しない。
- `pnpm run isolate:status` で必要度を判定する（HB 差分は `required`）。
- 推奨手順は `pnpm run isolate:worktree -- --name <slug>`（checkout なしで隔離）。
- `isolate:shadow-branch` はブランチ作成のみで checkout しない。
- 検証が通った場合だけPRまたはパッチ案として提示する。
- `loop-discover` が isolation finding を出し、`loop:run` がガイダンスを表示する。

## MEMORY 追記候補（Phase D）

- セッション終了時に `state/memory-candidates.json` へ候補を書く。
- セッション開始時に未反映候補をリマインドする。
- `PROJECT_MEMORY.md` は自動編集しない。反映は `/project-memory-learn` のみ。
- CLI: `pnpm run memory:candidates`

## 禁止事項

- 既存テストの期待値をAI都合で変更しない。
- `PROJECT_MEMORY.md` をAIが直接編集しない。
- Hard Boundary を検知したまま自動修正を続けない。
- 同じ失敗を繰り返して無限ループしない。
