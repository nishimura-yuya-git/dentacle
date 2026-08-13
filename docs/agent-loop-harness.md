# Agent Loop / SSoT / PROJECT_MEMORY ハーネス設計資料

## 1. 全体思想

今回入れた仕組みは、単なる便利コマンドではなく、AIが作業を始める前に「何を根拠に判断し、どこまで進め、どこで止まるか」を固定するためのハーネスである。

中心思想は以下の3つ。

- `PROJECT_MEMORY.md` と `.cursor/rules/*.mdc` を判断根拠のSSoTにする。
- `loops/` で作業目的ごとの実行ループを定義する。
- `scripts/` と `package.json` で、そのループを機械的に評価できるようにする。

全体の流れは以下。

```text
ユーザー入力
  ↓
rules による自動判定
  ↓
PROJECT_MEMORY / rules / 既存コード / 差分を読む
  ↓
適切な Loop を選ぶ
  ↓
実装
  ↓
doctor / test:changed / 各checkで評価
  ↓
pass / warn / stop を判断
```

## 2. 立法・司法・行政の構造

`constitution.mdc` では、プロジェクト全体を3層で整理している。

| 層 | 役割 | 実体 |
|---|---|---|
| 立法 | 何が正しいか | `PROJECT_MEMORY.md`, `.cursor/rules/*.mdc`, `docs/architecture/*.mmd` |
| 司法 | 守れているか | `src/__invariants__`（存在する場合）, `scripts/check-invariant-provenance.js`, 各check |
| 行政 | どう実行するか | `workflow.mdc`, `agent-loops.mdc`, `understanding-first.mdc`, `change-contract.mdc`, scripts |

AIの要約や判断は派生情報であり、最終判断は必ず `PROJECT_MEMORY.md` / rules / architecture docs に戻す。

## 3. PROJECT_MEMORY の位置づけ

`PROJECT_MEMORY.md` はプロジェクトの長期記憶である。

主な役割:

- 絶対に壊してはいけない業務コアを記録する。
- 重要関数、不変条件、過去バグ、仕様決定を保持する。
- AIが毎回参照するべきプロジェクト固有の判断根拠になる。

ただし、AIが勝手に編集してはいけない。更新が必要な場合は、`memory-learning.mdc` に従って「追記候補」をチャットに出し、人間が判断する。

## 4. SSoT の考え方

SSoT は `Single Source of Truth` で、「同じ意味の計算・判断を複数箇所に持たない」という考え方である。

案件ごとに特に重要なSSoTは `PROJECT_MEMORY.md` に記録する。

例:

- 金額・数量計算: `src/utils/*Calculation.ts`
- 表示値の優先順位解決: `resolve*DisplayValue`
- 自動再計算: `recalc*` / `sync*`
- 確定値・手動修正保護: `locked_fields` / `manual_fields` / `override_fields` など案件で採用した契約
- 権限・状態判定: `can*` / `resolve*Status`

禁止していること:

- 別画面で同じ金額・数量・状態判定の式を再実装する。
- SSoT関数のシグネチャや戻り値をAI都合で変更する。
- 既存SSoTをコピーして別実装にする。

正しい実装は、既存SSoT関数を import して使うことである。

## 5. Agent Loop の概念

Loop は「問題を解くための実行単位」である。

各Loopは以下の4要素で構成している。

| 要素 | 意味 |
|---|---|
| Goal | 何を達成するか |
| Context | 何を読んで判断するか |
| Evaluation | 何で検証するか |
| Stop | どこで自動続行を止めるか |

重要なのは、ユーザーが「Loopで進めて」と言わなくても、`agent-loops.mdc` が入力内容から自動判定する点である。

## 6. 今回定義した Loop

| Loop | 用途 |
|---|---|
| Main Doctor Loop | 通常差分が安全かを見る |
| Bug Fix Loop | お客さんの問題文から原因調査・修正・検証まで進める |
| Regression Guard Loop | 修正後に回帰がないか確認する |
| SSoT Debt Hunter Loop | SSoT違反・技術負債を小さく解消する |
| UI Polish Loop | 見本画像・スクショ・UI意図から完成度を上げる |

`agent-loops.mdc` により、以下のように自動選択する。

```text
通常実装・差分確認 → Main Doctor Loop
不具合・問題文 → Bug Fix Loop + Regression Guard
UI改善・画像・スクショ → UI Polish Loop + Regression Guard
SSoT警告 → SSoT Debt Hunter Loop + Regression Guard
修正後確認 → Regression Guard Loop
```

### 6.1 完成ゲート（開発精度向け Graph）

外側を Graph、内側だけ Loop にする。Harness が “done” と言っても未検証で、判定ノードが通るまで完成にしない。

| Loop | 正本 | 図 | maxIterations |
|---|---|---|---|
| Bug Fix | `loops/goals/bug-fix.md` | `loops/graphs/bug-fix.mmd` | 3 |
| UI Polish | `loops/goals/ui-polish-gate.md` + `loops/goals/ui-polish.md` | `loops/graphs/ui-polish.mmd` | 3 |
| Regression Guard | `loops/goals/regression-guard.md` | `loops/graphs/regression-guard.mmd` | 2 |

共通ルール:

| 要素 | 内容 |
|---|---|
| 判定ノード | `loop:evaluate` / `loop:evaluator`（+ 必要なら Regression Guard） |
| 差し戻し | 判定が `stop` または完成条件未達なら、完成報告禁止で生成ノードへ戻す |
| No progress | 同じ失敗シグネチャが 2 回連続したら停止（`scripts/lib/loop-progress.mjs`） |
| 完成/通過宣言 | チェックリスト・Evaluation結果・iteration を必須記載。自己申告完了は無効 |

目的は「賢さ」ではなく、甘い完成報告を通さないこと（PDCA の Check を固定する）である。

### 6.2 層モデル（Prompt → Context → Harness → Loop → Graph）

| 層 | unit of work | 実体 |
|---|---|---|
| Prompt | one input | 理解レポート、変更契約、UI Prompt 定型 |
| Context | what stays in the window | `loop:context` + Context Budget |
| Harness | the machine | Gather → Act → Verify（doctor / hooks / evaluator） |
| Loop | the run | Goal / Evaluation / Stop / maxIterations / No progress |
| Graph（制御） | nodes + edges | `loops/graphs/*.mmd` |
| Graph（知識・薄い） | entities + relations + grounding | Working Graph + Claim Grounding |

### 6.3 薄い知識Graph層（Phase Thin KG）

本格 NER / グラフDB / Claude 自動抽出は入れない。制御 Graph とは別に、次だけを入れる。

| 要素 | 役割 | 実体 |
|---|---|---|
| Claim Grounding | 評価器が主張を根拠に照合する | `scripts/lib/claim-grounding.mjs` |
| Working Graph | エージェント整理の共有メモリ | `scripts/lib/working-graph.mjs` / `state/working-graph.json` |
| 完成宣言ファイル | grounding の入力 | `state/completion-declaration.md` |

運用:

```bash
# 完成宣言を書いたあと
pnpm run loop:evaluator

# Entity / Relation を手動（エージェント整理）で追加
pnpm run working-graph -- upsert-entity --type=SCREEN --name=対象画面 --description=要約
pnpm run working-graph -- summary
```

- 完成宣言ファイルが無いとき、Claim Grounding は `skip`（通常の `loop:run` を止めない）
- Evaluation コマンド/結果が欠けると `stop`、根拠リンク不足は `warn`
- EntityType: `SCREEN | API | TABLE | SSOT | SYMPTOM | DOC`
- Relation: `touches | depends_on | reported_in`
- 将来の本格KG（抽出→解決→組立→クエリ）へ型だけ互換にしておく

## 7. UI Polish Loop の特徴

UI Polish Loop は、一発出しのUI品質を上げるためのLoopである。

特に重視するのは「コードを書く前に画像から抽出し、実装可能なトークン表まで落とす」こと。外部ブランドの DESIGN.md は置き換えず、書き方（トークン・定型・Iteration）だけ借りる。正本は `ui-design.mdc` / `ui-language.mdc` / `ui-design-hp-lp.mdc`。

抽出する内容:

- レイアウト構造
- 余白
- 色
- 重心
- 視線誘導
- タイポグラフィ
- ボタン階層
- 画像やキャラクターの見切れ
- PC / モバイル差
- 禁止事項との衝突
- 今回使うトークン表（5〜15行。canvas / surface / elevated、ink階層、primaryの役割など）

完成判定も実装前に作る。Evaluation前は次の順で小さく回す: 面の階層 → タイポ → 主ボタン → 余白・見切れ。

例:

```text
主要操作が1秒で分かる
見本画像と同じ余白・重心・視線誘導になっている
トークン表どおりの面階層・文字階層になっている
モバイルで見切れない
日本語文言だけで意味が伝わる
禁止アイコンライブラリを使っていない
```

### 7.1 Interface Review（jakubkrehel/skills 由来・案A）

判定ノードでは機械評価に加え、エージェント手順の横断レビューを回す。

| 部品 | パス | 役割 |
|---|---|---|
| 司令塔 | `.cursor/skills/better-interface/SKILL.md` | quick/full、Findings、Verdict、既定 read-only |
| polish 細部 | `.cursor/skills/better-ui/SKILL.md` | 同心円角丸、optical、motion restraint（既存トークン準拠） |
| コマンド | `.cursor/commands/better-interface.md` | `/better-interface` |

ドメインの色・文言・レイアウトの正本は既存 rules のまま。OKLCH強制移行・英語 writing の丸写し・禁止アイコンは取り込まない。出典: [jakubkrehel/skills](https://github.com/jakubkrehel/skills)（MIT）。

## 8. rules 側のハーネス

`.cursor/rules/` は、AIの行動を縛る実行ハーネスである。

今回追加・強化した主なもの:

| ファイル | 役割 |
|---|---|
| `constitution.mdc` | 最上位原則。Loopで完遂することを追加 |
| `agent-loops.mdc` | 入力内容からLoopを自動選択する |
| `workflow.mdc` | 実装前にLoop判定する流れを追加 |
| `understanding-first.mdc` | 理解レポートに適用Loopを必須記載 |
| `change-contract.mdc` | 変更契約にGoal / Evaluation / Stop / 完成判定を追加 |
| `ui-design.mdc` | UI画像・見本がある場合にUI Polish Loopを自動適用 |
| `ui-design-hp-lp.mdc` | HP/LPでも参考画像から先に抽出する |

これにより、Loopは「コマンドを知っている人だけが使うもの」ではなく、AIの通常動作に組み込まれている。

## 9. scripts 側のハーネス

`scripts/` は、ルールを機械的に検証するハーネスである。

| script | 役割 |
|---|---|
| `doctor.mjs` | 複数checkをまとめて実行する総合診断 |
| `loop-evaluate.mjs` | `doctor` と `test:changed` をJSON化し、pass/warn/stopを判断 |
| `loop-discover.mjs` | 差分・Hard Boundary・SSoT負債・UI変更・ハーネス変更を発見 |
| `loop-evaluator.mjs` | 生成役とは別の独立評価役として pass/warn/stop を判定 |
| `loop-context.mjs` | 差分、評価結果、重要ルール、PROJECT_MEMORYをまとめる |
| `loop-runner.mjs` | goalごとのLoopガイドを表示し、必要な検証を提示 |
| `test-changed.mjs` | 変更ファイルから実行すべき検証コマンドを推薦 |
| `check-hard-boundaries.mjs` | 業務コア・SSoT・DB・APIなど危険変更を検知 |
| `lib/hard-boundary-policy.mjs` | Hard Boundary パターン定義の SSoT |
| `lib/change-contract-gate.mjs` | 変更契約ゲート（pending / whitelist）の SSoT |
| `change-contract-gate.mjs` | 変更契約ゲート CLI（pending / approve / close） |
| `cursor-safety-guard.mjs` | PreToolUse で契約ゲート + Hard Boundary を deny |
| `lib/subagent-policy.mjs` | サブエージェント権限ポリシーの SSoT |
| `cursor-subagent-guard.mjs` | subagentStart で write 系・HB タスクを制御 |
| `cursor-subagent-stop.mjs` | subagentStop で HB 変更を検知して停止指示 |
| `lib/memory-candidates.mjs` | PROJECT_MEMORY 追記候補生成（自動編集しない） |
| `memory-candidates.mjs` | 追記候補 CLI |
| `lib/memory-audit.mjs` | PROJECT_MEMORY 要詰め監査（自動編集しない） |
| `memory-audit.mjs` | 要詰め監査 CLI |
| `cursor-session-*-memory.mjs` | sessionStart/End で候補リマインド |
| `lib/isolation-policy.mjs` | 危険差分の隔離判定 |
| `isolate.mjs` | shadow-branch / worktree CLI |
| `check-ssot.cjs` | SSoT再実装パターンを検知 |
| `ssot-debt-report.mjs` | SSoT違反を領域別に整理 |
| `check-architecture-boundaries.mjs` | import方向の境界違反を検知 |
| `check-invariant-provenance.js` | `invariants.mdc` と invariant test の対応を検証 |
| `lib/eval-template.mjs` | Eval template の採点（Future AGI 思想の薄い版） |
| `lib/failure-taxonomy.mjs` | stop/warn の失敗分類 |
| `harness-simulation.test.mjs` | 敵対シナリオでハーネスを回帰確認 |

## 10. package.json の入口

`package.json` には、AIや人間が同じハーネスを動かせる入口を置いている。

主なコマンド:

```bash
pnpm run doctor
pnpm run loop:run
pnpm run loop:bugfix
pnpm run loop:ssot
pnpm run loop:ui
pnpm run loop:discover
pnpm run loop:evaluate
pnpm run loop:evaluator
pnpm run loop:context
pnpm run test:changed
pnpm run check:hard-boundaries
pnpm run check:ssot
pnpm run ssot:debt
pnpm run check:architecture
pnpm run check:provenance
pnpm run memory:audit
pnpm run memory:candidates
pnpm run test:eval-template
pnpm run test:failure-taxonomy
pnpm run test:harness-simulation
```

用途別:

```text
通常の安全確認:
pnpm run loop:run

UI改善:
pnpm run loop:ui

不具合対応:
pnpm run loop:bugfix

SSoT負債確認:
pnpm run loop:ssot
pnpm run ssot:debt

総合診断:
pnpm run doctor

変更面別の推奨テスト:
pnpm run test:changed
```

## 11. doctor の中身

`pnpm run doctor` は総合診断である。

実行するもの:

- `check:hard-boundaries`
- `check:ssot`
- `check:architecture`
- `check:provenance`
- `test:changed`

必須チェックと警告チェックを分けている。

| check | required |
|---|---|
| Hard Boundary | warning扱い |
| SSoT再実装 | warning扱い |
| import境界 | 必須 |
| 不変条件provenance | 必須 |
| 変更面ごとの推奨検証 | warning扱い |
| PROJECT_MEMORY要詰め | warning扱い（critical で WARN） |

既存負債があるものは、いきなり開発を止めず `WARN` にしている。ただし、警告の根拠は Evidence Map に残す方針である。

## 12. loop-evaluate の判断

`loop-evaluate.mjs` は、Loopの評価をJSON化する。

判断ステータスは3つ。

| status | 意味 |
|---|---|
| `pass` | 続行可能 |
| `warn` | 続行可能だが警告理由を説明する必要あり |
| `stop` | 自動続行禁止。人間確認が必要 |

`stop` になる条件例:

- `doctor` の必須チェックが失敗。
- Hard Boundary を検知。
- Git管理外で評価不能。

`warn` になる条件例:

- SSoT既存負債。
- Hard Boundary warn-only。
- doctor が警告を出している。

## 12.1 loop-discover の発見

`loop-discover.mjs` は、ループの1ターンにおける「発見」を担当する。

発見するもの:

- Hard Boundary 変更
- SSoT再実装候補
- UI変更に対する表示確認の必要性
- ループハーネス自体の変更

通常は読み取り専用で JSON または人間向け出力を返す。必要な場合だけ、以下で状態を永続化する。

```bash
node scripts/loop-discover.mjs --write-state
```

保存先は `state/loop-findings.json`。これは会話をまたいで未解決の発見を引き継ぐためのループメモリであり、`PROJECT_MEMORY.md` の代替ではない。

## 12.2 loop-evaluator の独立評価

`loop-evaluator.mjs` は、生成役とは別の評価役として動く。

評価の姿勢:

```text
証明されるまで壊れている前提で、生成役とは別視点から評価する。
```

参照するもの:

- `loop-evaluate` の標準評価
- `loop-discover` の発見事項
- `state/loop-findings.json` の未解決状態
- `state/loop-progress.json` の連続失敗履歴（No progress）

`stop` を返した場合、`loop-runner` は自動続行しない。`warn` の場合は、Evidence Map や報告に警告根拠を残してから続行する。

### 12.2.1 No progress ブレーキ

| 項目 | 内容 |
|---|---|
| SSoT | `scripts/lib/loop-progress.mjs` |
| 保存先 | `state/loop-progress.json`（gitignore） |
| 条件 | 同じ失敗シグネチャが 2 回連続 |
| stop 連続 | verdict を `stop` に上げる |
| warn 連続 | verdict を少なくとも `warn` に上げる |
| ネスト呼び出し | `loop:context` は `--no-record`（二重記録防止） |
| 無効化 | `LOOP_PROGRESS_DISABLE=1` |
| 検証 | `pnpm run test:loop-progress` |

### 12.2.2 Claim Grounding

| 項目 | 内容 |
|---|---|
| SSoT | `scripts/lib/claim-grounding.mjs` |
| 入力 | `state/completion-declaration.md`（`LOOP_DECLARATION_FILE` で変更可） |
| skip | 宣言ファイルなし |
| stop | Evaluation コマンドまたは結果の欠落、空宣言、**UI Polish の観察証拠欠落**、**ページ枠照合欠落（observe-chrome）**、**骨格照合欠落（observe-borrow）**、**ライブ見本スクショ欠落（observe-reference-shot）** |
| warn | 根拠リンク不足（パス / MEMORY 節 / 根拠ノート） |
| 検証 | `pnpm run test:claim-grounding` |

#### Observe Loop（UI Polish 必須）

[desktop-harness](https://github.com/xfreeze2/desktop-harness) から借りたのは思想だけ（Mac CLI は入れない）。

```text
動かす → snapshot|screenshot → Read → 差分を書く → 直す
```

- 完成宣言の `観察証拠`（種別・パス・Read済み差分）が無い UI Polish は `stop`
- 完成宣言の `ページ枠照合`（見本 / 実装ページ全体 / 差分 / Read済み）が無い UI Polish は `stop`（欠落コード `observe-chrome`）
- 完成宣言の `骨格照合`（見本URL / 借りる / 借りない / Read済み）が無い UI Polish は `stop`（欠落コード `observe-borrow`）
- 見本が `http(s)` URL なのに見本が「なし」または URL 文字列のままなら `stop`（欠落コード `observe-reference-shot`）
- 内側パネルだけのスクショは観察として数えない。見本キャプチャと実装キャプチャ（ページ全体）のペアが必要
- Eval template `ui-polish.completion` の `observe-evidence` と `chrome-compare` と `borrow-copy` と `reference-shot` も必須
- 敵対シナリオ: `ui-complete-without-observe` / `ui-complete-inner-panel-only` / `ui-complete-without-borrow-copy` / `ui-complete-live-url-without-reference-shot`
- 知覚優先: 構造 snapshot → 見た目 screenshot（ページ全体） → vision は最終手段
- 出典の原則名: Verify, don't assume / Observe loop
- Hard Gate 文書: `loops/goals/ui-polish-gate.md`（Context Budget で must。長い goal 文書の後半は窓から落ちる）

## 13. loop-context の役割

`loop-context.mjs` は、AIが判断に必要な情報をまとめるスクリプトである。

集めるもの:

- 変更ファイル
- `loop-evaluate` の結果
- `loop-discover` の発見事項
- `loop-evaluator` の独立評価（`--no-record`）
- `state/loop-findings.json` の状態
- Context Budget で選別したルール / Loop 文書
- `PROJECT_MEMORY` 要詰め監査

### 13.1 Context Budget（Select / compress / drop）

| 項目 | 内容 |
|---|---|
| SSoT | `scripts/lib/context-budget.mjs` |
| unit of work | what stays in the window |
| must | `PROJECT_MEMORY` / `safety` / `agent-loops` / `change-contract` など |
| compress | 先頭 N 行だけ残す |
| drop | 今回の `--goal=` / 差分に不要な文書 |
| 指定 | `pnpm run loop:context -- --goal=ui-polish` または `LOOP_GOAL` |
| 検証 | `pnpm run test:context-budget` |

### 13.2 Working Graph（薄い共有メモリ）

| 項目 | 内容 |
|---|---|
| SSoT | `scripts/lib/working-graph.mjs` |
| 保存先 | `state/working-graph.json`（gitignore） |
| CLI | `pnpm run working-graph` |
| Context | `loop:context` が要約（最大12 entity / 12 relation）を載せる |
| 検証 | `pnpm run test:working-graph` |

AIが「何を読むべきか」を毎回手探りにしないためのContext生成ハーネスである。

## 14. loop-runner の役割

`loop-runner.mjs` は、Loopを人間にもAIにも読める形で実行する。

対応goal:

- `main-doctor`
- `bug-fix`
- `ssot-debt`
- `ui-polish`

現在の実装モードは `main-safe` のみ。

`main-safe` は、main上の現在差分を前提に評価するモードである。ブランチを強制せず、危険度が上がった時だけ停止・確認する。

## 15. Hard Boundary ハーネス

Hard Boundary は **差分後検知** と **編集前ブロック** の2層で守る。

### 15.1 差分後検知（司法）

`check-hard-boundaries.mjs` は、触ると危険な場所を検知する。

対象例:

- `supabase/migrations/`
- `supabase/functions/`
- `api/`
- `vercel.json`
- `vite.config.ts`
- `src/lib/supabase.ts`
- `src/lib/db.ts`
- 案件固有の業務コア・SSoT（`.cursor/hard-boundaries.json` に追加）
- `package.json` の依存関係変更

Hard Boundary に触れた場合、変更契約・Evidence Map・承認理由・検証証拠が必要になる。

### 15.2 編集前ブロック（PreToolUse）

`.cursor/hooks.json` の `preToolUse` が `scripts/cursor-safety-guard.mjs` を呼び、
`Write` / `StrReplace` / `Delete` / `EditNotebook` を次の順で判定する。

1. **変更契約ゲート（Phase B）**
2. **Hard Boundary（Phase A）**

- Hard Boundary パターンの SSoT: `scripts/lib/hard-boundary-policy.mjs`
- 変更契約ゲートの SSoT: `scripts/lib/change-contract-gate.mjs`
- フック失敗時は `failClosed: true` でブロック
- 検証: `pnpm run test:hard-boundary-hook`

#### 変更契約ゲートのモード

| mode | 編集 |
|---|---|
| `open`（ファイルなし含む） | Hard Boundary のみ適用 |
| `pending` | 全編集 deny（ユーザー承認待ち） |
| `approved` | `whitelist` 内のみ許可。Hard Boundary は別途 |

運用コマンド:

```bash
# 変更契約を出したあと（実装前）
pnpm run contract:pending -- --reason "変更契約提示: …" path1 path2

# ユーザーが OK / 進めて と承認したあと
pnpm run contract:approve -- --reason "ユーザー承認: 進めて"

# 作業完了後
pnpm run contract:close
pnpm run contract:status
```

- ゲートファイル `.cursor/change-contract-gate.json` は Write ツールでは編集できない（CLI のみ）
- 緊急バイパス: `CHANGE_CONTRACT_GATE_ALLOW=1`（契約ゲートのみ。Hard Boundary は別）

#### Hard Boundary 一時解除（作業後は必ず消す）

1. `.cursor/hard-boundary-session-allow.json`（例: `.cursor/hard-boundary-session-allow.example.json`）
2. 環境変数 `HARD_BOUNDARY_ALLOW=1`

`HARD_BOUNDARY_ALLOW=1` は Hard Boundary だけを越える。`pending` 中の契約ゲートは越えない。

既知の限界: Shell 経由のリダイレクト書き込みはこの層では止めない（差分後検知側で捕捉）。

### 15.3 サブエージェント権限（Phase C）

並列調査と実装委任を分離するため、`subagentStart` / `subagentStop` で権限を強制する。

設定: `.cursor/subagent-policy.json`  
SSoT: `scripts/lib/subagent-policy.mjs`  
フック: `scripts/cursor-subagent-guard.mjs` / `scripts/cursor-subagent-stop.mjs`

| 種別 | 扱い | 例 |
|---|---|---|
| read-only | 調査・説明。pending 中も起動可 | `explore`, `cursor-guide`, `ci-investigator` |
| write-capable | 実装・修正。pending 中は起動不可 | `generalPurpose`, `best-of-n-runner`, `bugbot`, `security-review` |
| shell | コマンド実行。pending 中は設定次第 | `shell` |

追加ルール:

- タスク文言が Hard Boundary に触れ、かつ変更契約の approved whitelist が足りない write 系は deny
- Hard Boundary 調査だけなら `explore` を使う
- サブエージェントが Hard Boundary を変更して終了した場合、`subagentStop` が follow-up で停止を指示する
- 緊急バイパス: `SUBAGENT_POLICY_ALLOW=1`
- 検証: `pnpm run test:subagent-policy`

未登録の `subagent_type` は deny（方針外の権限拡大を防ぐ）。

### 15.4 MEMORY 追記候補の自動リマインド（Phase D）

`PROJECT_MEMORY.md` は自動編集しない。代わりにセッション境界で「追記候補」だけを残す。

| タイミング | 処理 |
|---|---|
| `sessionEnd` | 差分・契約ゲート・ハーネス変更から候補を生成し `state/memory-candidates.json` へ保存（既存 chat 候補は消さない） |
| `sessionStart` | 未反映候補があれば `additional_context` でリマインド（一括再提示を促す） |
| CLI | `pnpm run memory:candidates` / `--write` / `--add` / `--learned <id>` / `--dismiss <id>` |
| コマンド | `/project-memory-pending` で pending を一括再提示 |

- 会話ログの自動解析はしない。チャット提示候補は `--add` で明示登録（`source: chat`）
- 古い候補は stale（要再確認）になる
- 反映は必ずユーザーが `/project-memory-learn` を実行したときだけ。反映後は `--learned`
- 無効化: `MEMORY_CANDIDATES_DISABLE=1`

### 15.5 危険差分の隔離（Phase E）

Hard Boundary や承認済み契約下の危険差分は、main 直編集を避けて隔離する。

| level | 意味 |
|---|---|
| `none` | 隔離不要（main-safe） |
| `recommend` | 長時間・不確実なら worktree/shadow を検討 |
| `required` | Hard Boundary 差分あり。隔離必須扱い |

```bash
pnpm run isolate:status
pnpm run isolate:recommend
pnpm run isolate:worktree -- --name hb-fix
pnpm run isolate:shadow-branch -- --name hb-fix
```

- `shadow-branch` は checkout しない（未コミット差分を壊さない）
- `worktree` は `.worktrees/<name>` に隔離コピーを作る
- `loop-discover` が isolation finding を出し、`loop:run` がガイダンスを表示する
- 検証: `pnpm run test:memory-isolation`

### 15.6 PROJECT_MEMORY 要詰め監査（Phase F / Memory Tighten）

議事録や決定を `PROJECT_MEMORY.md` に入れたあと、**まだ薄い箇所**を機械検出し、詰める優先順位を出す。

| 役割 | 実体 |
|---|---|
| 検出 | `scripts/lib/memory-audit.mjs` |
| CLI | `pnpm run memory:audit`（`--json` / `--fail-on=critical\|high\|any\|none`） |
| doctor | `PROJECT_MEMORY要詰め`（required: false。critical で WARN） |
| context | `loop:context` の `memoryAudit` |
| コマンド | `/project-memory-audit` |
| テスト | `pnpm run test:memory-audit` |

検出対象:

1. プレースホルダ残存（`[業務コアA]` 等。Markdownリンクは除外）
2. テンプレ表・中身が空に近い節
3. 決定文なのに関連ファイル導線がない節

重要:

- `PROJECT_MEMORY.md` は自動編集しない
- `memory:candidates`（足す）と役割分担する
- 反映は `/project-memory-learn` のみ
- 理解レポート §6 に要詰め件数を記載する運用とする

## 16. SSoT ハーネス

`check-ssot.cjs` は、SSoT違反を正規表現で検知する。

現在の主な検知パターン:

| ID | 内容 |
|---|---|
| `SSOT-*` | 案件で定義した計算・判定・表示優先度の再実装 |
| `SSOT-*` | 事実データから確定値を画面ごとに再計算している候補 |
| `SSOT-*` | 手動修正・確定済みデータ保護の独自判定 |

`ssot-debt-report.mjs` は、その結果を領域別に整理する。

対象領域例:

- `src/pages/*`
- `src/features/*`
- `src/components/*`
- `src/utils/*`

SSoT Debt Hunter Loop は、このレポートをもとに「1回に1領域だけ」小さく直すためのLoopである。

## 17. test:changed ハーネス

`test-changed.mjs` は、変更ファイルを見て推奨検証を出す。

例:

- 業務コア変更なら:
  - `pnpm run check:provenance`
  - `pnpm exec vitest run src/__invariants__`（存在する場合）
- `src/` や `scripts/` 変更なら:
  - `pnpm run type-check`
- UI変更なら:
  - `pnpm run test:e2e -- --list`
- rules / PROJECT_MEMORY 変更なら:
  - `pnpm run check:provenance`
- `src/`・`api/`・`supabase/`・`scripts/` 変更なら:
  - `pnpm run security:scan -- --working-tree`（§22）
- 常に追加:
  - `pnpm run check:hard-boundaries`
  - `pnpm run check:architecture`

これにより「何のテストを走らせるべきか」をAIの勘に任せない構造にしている。

## 18. Evidence Map

`change-contract.mdc` には Evidence Map を追加している。

目的は、変更の根拠と影響範囲を明示すること。

主な項目:

- Changed surface
- Entry point
- Owner boundary
- Caller
- Callee
- Sibling implementations
- Existing tests
- Current shipped behavior
- Missing evidence

特に業務コア、SSoT、DB、API、権限変更では必須である。

## 19. PRテンプレート

`.github/pull_request_template.md` には、PR時に以下を残す構造を入れている。

- 何の問題を解決するか
- なぜこの変更にしたか
- ユーザー影響
- Evidence Map
- 影響する不変条件
- 検証証拠
- Hard Boundary確認
- Security harness（CI Artifacts / ローカル findings）

PRを「差分の箱」ではなく「判断根拠の記録」にする意図である。

## 20. スライド構成案

スライド構成にするなら、以下の順番が分かりやすい。

1. なぜ必要か: AIが毎回同じ文脈を忘れる問題
2. 全体構造: PROJECT_MEMORY / rules / loops / scripts / package
3. 立法・司法・行政モデル
4. PROJECT_MEMORYの役割
5. SSoTの役割
6. Agent Loopの4要素
7. 自動Loop判定
8. UI Polish Loop
9. Bug Fix + Regression Guard
10. SSoT Debt Hunter
11. doctor / loop-evaluate / loop-runner の実行フロー
12. Hard Boundary / SSoT / Architecture / Provenance checks
13. package.json のコマンド一覧
14. 実際の運用例
15. 隔離: isolate:worktree / shadow-branch（Phase E）と MEMORY 候補リマインド（Phase D）

## 21. 要約

今回作ったものは「AIに毎回同じ安全確認・文脈確認・完成判定をさせるための実行ハーネス」である。

ルールで判断を縛り、Loopで作業を進め、scriptsで機械的に検証し、package scriptsで人間もAIも同じ手順を叩けるようにしている。

## 22. Security harness（GPT非依存・差分スキャン）

[openai/codex-security](https://github.com/openai/codex-security) から借りたのは **製品ではなく型** である。

- 差分スコープ
- knowledge-base（立法ファイルの明示）
- findings + coverage 成果物
- severity 閾値
- 自動 patch はしない

OpenAI API / Codex Security CLI には依存しない。

| 層 | 役割 |
|---|---|
| 統治（既存） | どこを触ってよいか、完成と言ってよいか |
| Security harness（本節） | 差分に秘匿情報・危険 API・禁止ロック等が無いか |

### 22.1 CI

- Workflow: `.github/workflows/security-harness.yml`
- `pnpm audit`（依存。失敗してもジョブ全体は scan 結果を優先して続行可）
- `pnpm run security:scan -- --diff <merge-base> --fail-on-severity high`
- findings を Artifact `security-findings` として 7 日保持
- **APIキー不要**

### 22.2 knowledge-base / ルール / 成果物

| 役割 | SSoT |
|---|---|
| knowledge-base 候補 | `scripts/lib/security-knowledge.mjs` |
| 検知ルール | `scripts/lib/security-rules.mjs` |
| findings 契約 | `scripts/lib/security-findings.mjs` |
| スキャン核 | `scripts/lib/security-scan-core.mjs` |
| CLI | `scripts/security-scan.mjs` |

knowledge-base に載せる立法:

- `PROJECT_MEMORY.md`
- `docs/agent-loop-harness.md`
- `docs/architecture/`（案件で追加された場合）
- `.cursor/rules/safety.mdc`
- `.cursor/rules/supabase-security-hardening.mdc`
- `.cursor/rules/supabase-security-rls.mdc`
- `.cursor/hard-boundaries.json`

主なルール例: 秘密鍵 / APIキー埋め込み、service role のフロント露出、`VITE_*SECRET*`、`eval` / `new Function`、`dangerouslySetInnerHTML`、`package-lock.json` / `yarn.lock`。

### 22.3 ローカル

```bash
pnpm run security:scan
pnpm run security:scan -- --diff origin/main
pnpm run security:scan -- --fail-on-severity medium
pnpm run test:security-scan
pnpm run security:hook
pnpm run test:security-hook
```

- 既定出力: `state/security-findings.json`（gitignore）
- doctor は WARN 扱い（`required: false`）
- `test:changed` / Regression Guard から推奨・必須寄りで接続

### 22.4 Cursor hook 自動実行

`.cursor/hooks.json` でバンドル実行する。手動3コマンドを毎回打たなくてよい。

| hook | 動作 |
|---|---|
| `stop` | `test:security-scan` + working-tree scan + diff scan を実行。失敗時は `followup_message` で完成を差し戻す |
| `sessionStart` | 前回 stop 失敗が残っていれば `additional_context` でリマインド |

実装:

- SSoT: `scripts/lib/security-hook-runner.mjs`
- hook: `scripts/cursor-security-hook.mjs`
- 最終結果: `state/security-hook-last.json`
- 手動同等: `pnpm run security:hook`

環境変数:

| 変数 | 意味 |
|---|---|
| `SECURITY_HOOK_DISABLE=1` | hook 全体を無効化（常用禁止） |
| `SECURITY_HOOK_SKIP_DIFF=1` | diff スキャンだけスキップ |
| `SECURITY_HOOK_DIFF_BASE` | diff 比較先（既定: `origin/main` → `main` の順） |
| `SECURITY_FAIL_ON_SEVERITY` | 閾値（既定: `high`） |

編集のたびに走るわけではない。**完成しようとしたとき（stop）** にまとめて走る。

#### Git 未初期化時の扱い（雛形コピー直後）

- `security:scan` / stop hook の working-tree・diff スキャンは、`.git` が無い場合 **fail せず skip（exit 0）** する。
- これは `diff base` が無いときと同じ扱い。雛形を案件フォルダへコピーした直後に完成報告が差し戻されるのを防ぐ。
- `test:security-scan`（unit）は Git 不要のため、非 Git でも実行する。
- 本開発開始時に `git init`（必要なら初回コミット）すると、以降は通常どおり差分スキャンが有効になる。
- 雛形同梱での自動 `git init` はしない（Obsidian 配下や親リポとの衝突を避ける）。
- 失敗 followup に `SECURITY_HOOK_DISABLE` の案内は出さない（実装は残すが常用させない）。

### 22.5 意図的に入れないもの

- OpenAI / Codex Security 製品への依存
- `CODEX_SECURITY_API_KEY` 等の外部資格情報
- 自動 patch / 自動修復
- ハーネス統治層（変更契約・Hard Boundary）の置き換え
- 毎キーストロークでのスキャン（遅すぎるため stop に集約）

## 23. Quality Loop 思想の薄い取り込み（Future AGI 由来・製品なし）

[future-agi/future-agi](https://github.com/future-agi/future-agi) から借りたのは **思想だけ** である。  
Django / ClickHouse / Gateway / Protect / LLM-as-judge / Prompt optimization は入れない。

品質ループの読み方:

```text
Observe（loop:discover / traces 相当）
  → Evaluate（loop:evaluator + Eval template）
  → Gate（pass / warn / stop）
  → 次の修正（生成ノードへ差し戻し）
```

既存の Gather → Act → Verify と同じ閉ループを、評価契約として明示しただけである。

### 23.1 Eval template（template → config → run → score）

| 要素 | 実体 |
|---|---|
| template | `loops/evals/*.json` |
| config | Loop goal / 完成宣言 / evaluator 結果 |
| run | `pnpm run loop:evaluator` |
| score | `pass` / `warn` / `stop` + 欠落 criteria |

- SSoT: `scripts/lib/eval-template.mjs`
- 完成宣言が無いときは `skip`（通常の `loop:run` を止めない）
- 必須 criteria 不足は `stop`、任意不足は `warn`
- 検証: `pnpm run test:eval-template`

### 23.2 Failure taxonomy（失敗分類）

stop/warn を原子的な class に正規化する。

| class | 意味 |
|---|---|
| `hard-boundary` | 保護対象への無断編集 |
| `contract-gate` | 変更契約 pending / whitelist 外 |
| `ssot-debt` | SSoT 再実装・負債 |
| `claim-grounding` | 完成宣言の根拠不足 |
| `no-progress` | 同じ失敗の繰り返し |
| `eval-template` | Eval template 未充足 |
| `architecture-boundary` | import 境界 |
| `security-finding` | セキュリティ所見 |

- SSoT: `scripts/lib/failure-taxonomy.mjs`
- `loop:evaluator` の JSON / 人間向け出力に `failureTaxonomy` を付与
- 検証: `pnpm run test:failure-taxonomy`

### 23.3 Harness simulation（敵対シナリオ）

本番エージェントの会話シミュレーションではなく、ハーネス破壊を試みる回帰である。

- シナリオ: `loops/simulations/adversarial-scenarios.json`
- 実行: `pnpm run test:harness-simulation`
- persona × scenario × expected permission / failure class

### 23.4 意図的に入れないもの

- Future AGI クラウド / self-host スタック
- `ai-evaluation` / Simulate / Protect / Gateway SDK
- LLM-as-judge を司法層の主評価にすること
- Prompt optimization による「賢さ」依存
