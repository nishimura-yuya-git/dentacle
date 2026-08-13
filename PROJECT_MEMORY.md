# 🧠 PROJECT_MEMORY.md

> このファイルは **プロジェクト横断で使える長期記憶テンプレート** です。
> 実案件へ導入するときは、`[ ]` のプレースホルダをその案件の内容に置き換えてください。
> AI（Cursor / Claude / その他LLM）は作業開始時に必ず読み、ここに書かれた境界・不変条件を優先します。
> **AIによる自動編集は禁止。更新提案はチャットで提示し、人間が反映してください。**

---

## 1. プロジェクト概要

| 項目 | 内容 |
|---|---|
| プロジェクト名 | 訪問歯科スケジュール自動化（`Detacle`） |
| サービス名 | **デンタクル**（対外・画面向けブランド名。内部識別子は `Detacle`。§6.17） |
| 目的 | 訪問歯科のルート最適化をAIと掛け合わせ、ボタン操作で1日の訪問スケジュール案を生成する |
| 主な利用者 | 管理者 / 訪問コーディネーター / 受付・コール担当 / 医師 / 歯科衛生士 |
| 技術スタック | Vite + React 18 + TypeScript / Tailwind CSS / **Supabase（セキュリティ最優先・RLS必須）** / Vercel |
| AI裏処理 | Cursor SDK。開発 local / 本番 **Cloud**。DB・レセコン直結禁止（Adapter・HTTP MCP）。self-hosted 当面不要。モデルは §6.14 カスケード（実装後続） |
| 本番環境 | 要確認（デプロイ先・本番URLは未確定） |
| パッケージマネージャ | `pnpm` 固定（`npm` / `npx` / `yarn` 禁止） |
| 最重要領域 | 訪問スケジュール自動提案 / ルート最適化 / 電話確認→本予約化 / 構造化制約（精度の正） |
| 想定顧客 | 株式会社Cスリー（訪問歯科） |
| 参照調査 | Apotool & Box for Dentist 調査（2026-06-14）。機能骨格の正本は `doc/Apotool管理ツール調査結果_訪問歯科スケジュール自動化.md`。医院内予約管理の模倣対象であり、完成形ではない（§6.5 / §6.18） |

---

## 2. 🚫 絶対に壊してはいけないポイント（Hard Boundaries）

> ここに書かれたものは、明示的な指示なしに変更・削除・リネームしてはならない。
> AIが触ろうとする場合は、必ず変更契約とユーザー承認を取ること。

### 2.1 変更前に承認必須のファイル・領域

#### インフラ・設定

- `[api/**]` — 本番API・メール・Webhook・外部連携
- `[supabase/migrations/** または db/migrations/**]` — 既存マイグレーションの破壊的変更は禁止
- `[supabase/functions/** または serverless functions]` — Edge Function / Serverless Function
- `[vercel.json / vite.config.ts / next.config.js / tsconfig*.json]` — ビルド・ルーティング設定
- `[src/lib/supabase.ts / src/lib/db.ts など]` — DBクライアント初期化
- `[package.json]` — dependencies 変更は承認必須

#### 業務コア

| 領域 | 主なファイル・テーブル | 壊れると起きること |
|---|---|---|
| スケジュール自動提案 | `server/schedule/*`（`runProposeJob` / snapshot / prompt / parse / validate / apply / pack）、`api/schedule/propose.ts`、`api/schedule/gap-fill.ts`（§6.34 / §6.37 / §6.47） | 割付ズレ、重複訪問、制約無視の配置 |
| ルート最適化 | `src/utils/schedule/travelDistance.ts` + 割付スナップショットの距離行列（§6.16 / §6.39）。SDKは結果を読むだけ | 移動過多、施設まとめ崩れ、車両/チーム偏り |
| 電話確認→本予約化 | `ensurePhoneConfirmationForVisit` 等（§6.6 / §6.32）。`visit_phone_confirmations` | 未確認の本予約化、NG後の再提案漏れ |
| 患者訪問条件 | 患者制約・Day0 / 割付ナレッジ（§6.13 / §6.48）。構造化制約テーブルの細部は要確認 | 頻度・曜日・医師同行などの制約欠落 |
| ログインIP・認証監査 | `auth_audit_logs` / `log_auth_audit_event` / `auth_ip_blocks` / `auth_presence`、閲覧UI `/auth-audit`（§6.15） | 監査欠落、院ユーザーへの漏洩、改ざんIPの採用、誤ブロック・運営ロックアウト |

#### 共通計算・共通判定

- 自動提案ロジック — `server/schedule/*`（対象抽出・仮配置・制約判定・精度ゲート。フロント再実装禁止・§6.11）
- 予約/電話確認ステータス解決 — §6.6（仮予約 / 本予約 / 電話結果の優先。画面ごとの独自判定禁止）
- ルート最適化・距離 — `src/utils/schedule/travelDistance.ts`（生住所をエージェントに渡さない・§6.12）
- 権限判定 — `is_platform_admin()` / クリニックロール helpers（§6.29 / §6.40）。運営と院 admin を混同しない

これらは **importして使う**。コピー・再実装・シグネチャ変更は禁止。
ファイルパスは上記のとおり確定済み。未確定と書いた箇所だけ実装時に追加固定する。

### 2.2 Hard Boundary PreToolUse ガード（2026-07-18 決定）

- Hard Boundary は差分後検知（`check-hard-boundaries`）に加え、編集前ブロック（PreToolUse）で守る。
- `Write` / `StrReplace` / `Delete` / `EditNotebook` が保護対象を触る場合、`scripts/cursor-safety-guard.mjs` が `permission: "deny"` する。
- パターン定義の SSoT は `scripts/lib/hard-boundary-policy.mjs`。案件固有追加は `.cursor/hard-boundaries.json`。
- ユーザー明示承認後のみ一時解除する:
  - `.cursor/hard-boundary-session-allow.json`（作業後に必ず削除）
  - または環境変数 `HARD_BOUNDARY_ALLOW=1`
- Shell リダイレクト書き込みはこの層では止めない。差分後検知側で捕捉する。
- 関連: `.cursor/hooks.json`, `scripts/cursor-safety-guard.mjs`, `docs/agent-loop-harness.md` §15

### 2.3 変更契約ゲート（2026-07-18 決定）

- PreToolUse の判定順は「変更契約ゲート → Hard Boundary」。
- `pending`: 全編集を deny。変更契約提示後・ユーザー承認前に実装へ進まない。
- `approved`: `whitelist` 内のみ編集可。Hard Boundary 対象は別途 session-allow / `HARD_BOUNDARY_ALLOW` が必要。
- `open`（ゲートなし含む）: Hard Boundary のみ（§2.2）。
- 運用コマンド:
  - `pnpm run contract:pending -- --reason "変更契約提示: …" path1 path2`
  - `pnpm run contract:approve -- --reason "ユーザー承認: 進めて"`
  - `pnpm run contract:close`（作業後必須）
- ゲートファイル `.cursor/change-contract-gate.json` は Write ツールでは編集不可（CLI のみ）。
- `HARD_BOUNDARY_ALLOW=1` は契約ゲート（pending）を越えない。緊急時のみ `CHANGE_CONTRACT_GATE_ALLOW=1`。
- 関連: `scripts/lib/change-contract-gate.mjs`, `scripts/change-contract-gate.mjs`, `docs/agent-loop-harness.md` §15.2

### 2.4 サブエージェント権限（2026-07-18 決定）

- 調査は `explore` 等の read-only 種別を優先する。実装委任と調査を混同しない。
- 変更契約が `pending` のあいだ、write 系（`generalPurpose` / `best-of-n-runner` 等）の起動は deny。
- タスク文言が Hard Boundary に触れ、approved whitelist が足りない write 系も deny。
- 未登録の `subagent_type` は deny（方針外の権限拡大を防ぐ）。
- サブエージェントが Hard Boundary を変更して終了した場合、`subagentStop` の follow-up で自動続行を止める。
- 設定: `.cursor/subagent-policy.json` / SSoT: `scripts/lib/subagent-policy.mjs`
- 緊急バイパス: `SUBAGENT_POLICY_ALLOW=1`（常用禁止）
- 関連: `scripts/cursor-subagent-guard.mjs`, `scripts/cursor-subagent-stop.mjs`, `docs/agent-loop-harness.md` §15.3

### 2.5 MEMORY 追記候補の自動リマインド（2026-07-18 決定 / 2026-08-09 改定）

- `PROJECT_MEMORY.md` は AI が自動編集しない（この原則は維持）。
- `sessionEnd` で差分・契約ゲート・ハーネス変更から追記候補を生成し、`state/memory-candidates.json` に保存する。
- `sessionStart` で未反映候補があれば `additional_context` としてリマインドする（一括再提示を促す）。
- **会話ログの自動解析はしない。** チャットで提示した候補は `pnpm run memory:candidates -- --add` で明示登録する（`source: chat`）。sessionEnd 再生成でも chat 候補は消えない。
- 未反映の一括再提示: `/project-memory-pending` または `pnpm run memory:candidates`。
- 反映はユーザーが `/project-memory-learn` を明示実行したときだけ。反映後は `--learned <id>`、破棄は `--dismiss <id>`。
- 古い候補は stale（要再確認）とする。無効化: `MEMORY_CANDIDATES_DISABLE=1`
- 関連: `scripts/lib/memory-candidates.mjs`, `scripts/memory-candidates.mjs`, `.cursor/commands/project-memory-pending.md`, `docs/agent-loop-harness.md` §15.4

### 2.6 危険差分の隔離（2026-07-18 決定）

- Hard Boundary 差分がある場合、隔離 level は `required`。main 直編集を避け、worktree / shadow を使う。
- `recommend`: 契約 pending や長時間作業など。`none`: 通常の main-safe。
- 推奨手順: `pnpm run isolate:status` → `pnpm run isolate:worktree -- --name <slug>`
- `isolate:shadow-branch` はブランチ作成のみで checkout しない（未コミット差分を壊さない）。
- `loop-discover` が isolation finding を出し、`loop:run` がガイダンスを表示する。
- 関連: `scripts/lib/isolation-policy.mjs`, `scripts/isolate.mjs`, `docs/agent-loop-harness.md` §15.5

### 2.7 Bug Fix 完成ゲート（2026-07-21 決定）

- 開発精度向上のため、Bug Fix Loop の外側遷移は Graph、内側の調査・修正だけ Loop とする。
- 「修正した」自己申告だけでは完成にしない。判定ノード（`loop:evaluate` / `loop:evaluator` + Regression Guard）が `pass`、または説明可能な `warn` になるまで完成扱いにしない。
- 判定が `stop`、または完成条件未達のときは完成報告禁止で生成ノードへ差し戻す。
- 生成↔判定の往復は `maxIterations: 3`。到達、または同じ失敗が 2 回続いたら人間確認へ回す。
- 完成時は `loops/goals/bug-fix.md` の「完成宣言」フォーマット必須（iteration・チェックリスト・Evaluation結果）。宣言なしは未完成。
- 他 Loop への横展開は、Bug Fix で効果を確認してから行う。実施状況は §2.9 を参照。
- 関連: `loops/goals/bug-fix.md`, `loops/graphs/bug-fix.mmd`, `docs/agent-loop-harness.md` §6.1, `loops/README.md`

### 2.8 Memory Tighten / 要詰め監査（2026-07-21 決定）

- 議事録・決定を `PROJECT_MEMORY.md` に入れたあと、薄い箇所を機械検出し詰める優先順位を出す（仕様密度ゲート）。
- `memory:candidates` は「足す」候補、`memory:audit` は「詰める」候補。役割を混ぜない。
- 検出対象: プレースホルダ残存、テンプレ表・空に近い節、決定文なのに関連ファイル導線がない節。
- `PROJECT_MEMORY.md` は自動編集しない。提示のみ。反映は `/project-memory-learn`。
- `doctor`（WARN）と `loop:context` に載せ、理解レポート §6 に要詰め件数を記載する。
- 打ち合わせ直後は `/project-memory-audit` または `pnpm run memory:audit` を回す。
- 関連: `scripts/lib/memory-audit.mjs`, `scripts/memory-audit.mjs`, `docs/agent-loop-harness.md` §15.6, `.cursor/commands/project-memory-audit.md`

### 2.9 ハーネス層強化: No progress / Context Budget / Graph横展開（2026-07-28 決定）

- Prompt → Context → Harness → Loop → Graph の層モデルをハーネス運用に明示する（unit of work を層ごとに固定する）。
- No progress: `loop:evaluator` が評価シグネチャを `state/loop-progress.json` に記録する。同じ stop が 2 回連続したら自動続行禁止。同じ warn が 2 回連続したら方針変更を要求する。`loop:context` 経由は `--no-record`（二重記録防止）。無効化は `LOOP_PROGRESS_DISABLE=1`。
- Context Budget: `loop:context` は must / compress / drop で「窓に残す文書」を選ぶ。`--goal=` または `LOOP_GOAL` で切り替える。
- Graph 完成ゲートの横展開: UI Polish（`maxIterations: 3`）と Regression Guard（`maxIterations: 2`）にも適用する。「実装した」「直ったはず」の自己申告だけでは完成にしない。完成/通過宣言フォーマット必須。
- §2.7 の横展開方針に対し、本決定で UI Polish / Regression Guard への適用を承認した扱いとする。
- 関連: `scripts/lib/loop-progress.mjs`, `scripts/lib/context-budget.mjs`, `loops/graphs/ui-polish.mmd`, `loops/graphs/regression-guard.mmd`, `loops/goals/ui-polish.md`, `loops/goals/regression-guard.md`, `docs/agent-loop-harness.md` §6.1 / §6.2 / §12.2.1 / §13.1

### 2.10 薄い知識Graph層: Claim Grounding / Working Graph（2026-07-28 決定）

- 制御 Graph（`loops/graphs/*.mmd`）とは別に、知識Graphの薄い層をハーネスに入れる。本格 NER・グラフDB・Claude 自動抽出パイプラインは入れない。
- Claim Grounding: 完成宣言（`state/completion-declaration.md`）の主張を Evaluation 結果・根拠リンクと照合する。宣言ファイルが無いときは `skip`（通常の `loop:run` を止めない）。Evaluation 欠落は `stop`、根拠不足は `warn`。
- Working Graph: エージェントが整理した Entity / Relation だけを `state/working-graph.json` に残す。型は `SCREEN | API | TABLE | SSOT | SYMPTOM | DOC`、関係は `touches | depends_on | reported_in`。
- 完成報告時は宣言を `state/completion-declaration.md` に書き、`pnpm run loop:evaluator` で Claim Grounding を通す。
- 将来の本格KG（抽出→解決→組立→クエリ）へ型だけ互換にしておく。全面導入は要件が揃うまで行わない。
- 関連: `scripts/lib/claim-grounding.mjs`, `scripts/lib/working-graph.mjs`, `scripts/working-graph.mjs`, `docs/agent-loop-harness.md` §6.3 / §12.2.2 / §13.2, `loops/goals/bug-fix.md`

### 2.11 UI Polish Interface Review（2026-07-29 決定）

- UI Polish Loop の判定ノードでは、機械評価に加え Interface Review（`/better-interface` quick|full）を回す。
- 正本スキル: `.cursor/skills/better-interface/SKILL.md`（司令塔）、`.cursor/skills/better-ui/SKILL.md`（同心円角丸・optical・motion restraint）。
- 色・余白・文言のトークン正本は引き続き `ui-design.mdc` / `ui-language.mdc` / `ui-design-hp-lp.mdc`。外部スキルで上書きしない。
- Verdict が `Block` なら完成報告禁止で生成ノードへ差し戻す。完成宣言に mode / Verdict / Findings 件数を書く。
- 取り込まない: OKLCH強制移行、英語 writing の丸写し、全面強影、禁止アイコン提案。案B（layout/a11y/writing-ja 独立スキル）は未導入。
- 出典の考え方: [jakubkrehel/skills](https://github.com/jakubkrehel/skills)（MIT）。日本語化・案件ルール差し替え済み。
- 関連: `.cursor/commands/better-interface.md`, `loops/goals/ui-polish.md`, `loops/graphs/ui-polish.mmd`, `docs/agent-loop-harness.md` §7.1, `scripts/lib/context-budget.mjs`

### 2.12 Security harness（GPT非依存・手動スキャン）（2026-07-29 決定 / 2026-07-31 追記 / 2026-08-08 改定）

- セキュリティ検証レイヤは **OpenAI / Codex Security 製品に依存しない**。借りるのは差分スキャン / knowledge-base / findings / severity の型だけ。
- 正本コマンド: `pnpm run security:scan`（成果物 `state/security-findings.json`）。CI は `.github/workflows/security-harness.yml`（APIキー不要）。
- `CODEX_SECURITY_API_KEY` 前提の実装に戻さない。自動 patch / 自動修復は入れない（変更契約・Hard Boundary と衝突しやすい）。
- **Cursor hook での自動実行は無効（2026-08-08 決定）**:
  - `stop` / `sessionStart` に `cursor-security-hook.mjs` を登録しない
  - 完成報告を security hook で差し戻さない
  - 必要なときだけ手動で `pnpm run security:scan` / `pnpm run security:hook` を実行する
  - スクリプト本体（`scripts/cursor-security-hook.mjs` 等）は残してよい。hook への再登録はユーザー明示指示があるまでしない
- 編集のたびにスキャンしない。
- **Git 未初期化時（雛形コピー直後など `.git` 無し）**: working-tree / diff スキャンは fail せず **skip（exit 0）**。`test:security-scan`（unit）は実行してよい。
- **案件化・本開発開始時**: `git init`（必要なら初回コミット）してから実装する。雛形同梱での自動 `git init` はしない（親リポ / Obsidian 配下との衝突を避ける）。
- 関連: `scripts/security-scan.mjs`, `scripts/lib/security-rules.mjs`, `scripts/lib/security-hook-runner.mjs`, `scripts/cursor-security-hook.mjs`, `.cursor/hooks.json`, `docs/agent-loop-harness.md` §22, `pnpm run security:hook`

### 2.13 Quality Loop 思想の薄い取り込み（Future AGI 由来・製品なし）（2026-08-05 決定）

- [Future AGI](https://github.com/future-agi/future-agi) から借りるのは **思想だけ**。製品スタック・SDK・クラウド連携は入れない。
- 取り込む3点:
  1. Eval template（template → config → run → score）: `loops/evals/*.json` + `scripts/lib/eval-template.mjs`
  2. Failure taxonomy（失敗分類）: `scripts/lib/failure-taxonomy.mjs`（`loop:evaluator` 報告に付与）
  3. Harness simulation（敵対シナリオ）: `loops/simulations/adversarial-scenarios.json` + `pnpm run test:harness-simulation`
- 品質ループの読み方: Observe（discover）→ Evaluate（evaluator + template）→ Gate（pass/warn/stop）→ 次の修正。
- 司法層の主評価は既存の決定論チェックのまま。**LLM-as-judge を主評価にしない。**
- 入れないもの: Future AGI self-host / Gateway / Protect / Prompt optimization / Voice simulation。
- 関連: `docs/agent-loop-harness.md` §23, `loops/evals/`, `loops/simulations/`, `loops/README.md`, `pnpm run test:eval-template`, `pnpm run test:failure-taxonomy`

### 2.14 Observe Loop（UI Polish 観察証拠必須）（2026-08-11 決定）

- UI Polish の完成申告は、画面を動かしたうえで snapshot または screenshot を取得し、**Read して差分を1行以上書いた観察証拠**が必須。キャプチャ未読の完成申告は無効。
- 完成宣言の `観察証拠` に含める項目: 種別（`snapshot` | `screenshot`）・パス（または取得名）・`Read済み: はい（差分1行）`。
- Claim Grounding（§2.10）と Eval template `ui-polish.completion` の `observe-evidence` が欠落すると `stop`。敵対シナリオ `ui-complete-without-observe` で回帰監視する。
- 知覚の優先順位: 構造 `browser_snapshot` → 見た目 screenshot → vision による推測は最終手段。
- 出典の原則名: Verify, don't assume / Observe loop（[desktop-harness](https://github.com/xfreeze2/desktop-harness) から借りるのは思想だけ。Mac CLI は入れない）。
- Interface Review（§2.11）と併用する。観察証拠があっても Verdict が `Block` なら完成報告禁止。
- 関連: `scripts/lib/claim-grounding.mjs`, `loops/goals/ui-polish.md`, `loops/evals/ui-polish.completion.json`, `loops/simulations/adversarial-scenarios.json`, `.cursor/skills/playwright-mcp-testing/SKILL.md`, `docs/agent-loop-harness.md` §12.2.2

---

## 3. 🔑 Single Source of Truth（SSoT）

業務上重要な計算・判定・表示優先度は、必ず1箇所に集約する。

| 領域 | SSoT | 役割 | 参照する画面・処理 |
|---|---|---|---|
| 訪問スケジュール自動提案 | `server/schedule/*`（snapshot / prompt / parse / validate / apply） | 対象抽出・制約適用・仮配置（SDK Adapter） | カレンダー自動提案、割付ジョブ |
| 割付方針（実行時） | `loadProposeMemorySections.ts` + `proposePolicy.ts` | MEMORY 割付関連節を実行時抽出して SDK へ。全文/.cursor全ルールは渡さない | `buildProposePrompt`、Cursor SDK |
| ルート最適化 | Cursor SDK + `travelMinutesMatrix`（§6.16 / §6.39 / §6.8 / §6.48） | **エリア束→号車並行ルート→号車内密連続**。距離はアプリ算出行列を読む。シリアル1号車詰めは正ではない | 自動提案、日別訪問表 |
| 電話確認→本予約 | 要確認（関数・ファイル未確定） | 仮予約/本予約/再提案の判定 | 連絡者リスト、カレンダー |
| 患者訪問条件 | `patient_visit_conditions` + `visitDueUrgency.ts` | 頻度・曜日・期限緊急度の正（§6.39） | 患者カルテ、自動提案 |
| 構造化制約（NG/不在/可能枠） | 要確認（テーブル・ファイル未確定） | 割付精度の正。自由記述Wikiではない（§6.13） | 制約マスタ、電話確認昇格、割付ジョブ |
| 距離行列（住所→移動根拠） | `src/utils/schedule/travelDistance.ts` | 座標/距離の算出。エージェントは結果を読むだけ（§6.16） | 割付ジョブ、ルート最適化 |
| ログインIP・認証監査 | `auth_audit_logs` + `log_auth_audit_event` + `auth_ip_blocks` + `auth_presence` | 誰がいつどこから認証したか。clinic/memberships・地図・IPブロック・在席心拍。閲覧UIは運営のみ `/auth-audit`（§6.15） | ログイン監査画面 |

### 禁止

- 同じ計算式を複数ファイルに書く
- 画面ごとに合計・端数処理・優先順位を変える
- SSoT関数の中身を「ついでに改善」する
- 既存テストを実装都合で書き換える

---

## 4. 🗄️ DB設計・計算系データの原則

計算系の値は、画面で都度再計算せず、以下の流れにする。

```text
事実データ
  ↓
単一の計算コア
  ↓
DB上の確定・集計テーブル
  ↓
各画面は表示のみ
```

### 4.1 3層構造

| 層 | 役割 | 例 |
|---|---|---|
| 事実テーブル | 起きた事実を保存 | `[logs / requests / raw_events]` |
| 確定テーブル | 計算済みの日別・業務単位結果 | `[summaries / settlements / daily_results]` |
| 集計テーブル | 月次・ランキング・請求などの表示単位 | `[monthly_summaries / invoices / ranking_snapshots]` |

### 4.2 禁止

- 確定テーブルがあるのに、画面側で事実テーブルから再計算する
- マスタ変更だけで過去の確定済みデータを無条件に塗り替える
- 同じ意味の値を複数テーブルに持つのに同期契約がない
- `null` を暗黙に通常扱い・売上対象・給与対象などへ倒す

### 4.3 必須

- 計算時点の単価・率・条件は確定テーブルに保存する
- 過去分を再計算する場合は、対象範囲・理由・影響件数を明示する
- 不足データは仮計算で埋めず、「未確定」「データ不足」として検知する
- 手動修正・確定済みデータは再計算で上書きしない

---

## 5. 🔁 同期契約が必要な値

同じ業務意味を複数テーブルに持つ場合、必ず同期契約を明記する。

| 業務意味 | 正とするテーブル | 同期先 | 同期タイミング | 失敗時 |
|---|---|---|---|---|
| `[配置/ロール]` | `[table.column]` | `[table.column]` | `[保存時/承認時]` | `[全体失敗にする]` |
| `[ステータス]` | `[table.column]` | `[table.column]` | `[確定時]` | `[ロールバック/再試行]` |
| `[金額]` | `[table.column]` | `[table.column]` | `[締め時]` | `[再計算禁止/警告]` |

### 禁止例

```text
画面表示は table_a.role を見る
計算処理は table_b.position を見る
片方だけ更新されても成功扱い
```

この状態は画面表示と計算結果の不一致を生むため禁止。

---

## 6. 📐 ドメインルール（業務知識）

### 6.1 金額・数量・時間

- 金額は `[整数円 / 小数あり / 税込税抜]` で扱う
- 端数処理は `[四捨五入 / 切り上げ / 切り捨て]`
- 数量計算は `[計算式]`
- 時間計算は `[丸めルール]`
- タイムゾーンは `[Asia/Tokyo など]`

### 6.2 ステータス遷移

| 領域 | 許可ステータス | 遷移 |
|---|---|---|
| `[例: 申請]` | `[pending, approved, rejected]` | `[pending → approved/rejected]` |
| `[例: 精算/請求]` | `[draft, confirmed, closed]` | `[draft → confirmed → closed]` |

ステータス名の追加・削除・意味変更は破壊的変更として扱う。

### 6.3 手動修正の保護

- 手動修正フィールドは `[manual_fields / locked_fields / override_flags]` で明示する
- 自動再計算は保護対象を上書きしない
- 手動修正を解除する操作は明示的に用意する

### 6.4 パッケージ管理（2026-05-14 決定）

- このプロジェクトのパッケージマネージャは `pnpm` に固定する。
- `npm` / `npx` / `yarn` は使用しない。`package-lock.json` / `yarn.lock` は作成・更新しない。
- 新しいパッケージを追加する場合は、公開から3日（4320分）以上経過したバージョンのみ採用する。
- `.npmrc` の `minimum-release-age=4320` を維持し、公開直後パッケージによるサプライチェーンリスクを避ける。
- 依存関係変更後は `pnpm install` → `pnpm run build` → `pnpm test` の順で確認する。
- 関連: `package.json`, `.npmrc`, `pnpm-lock.yaml`, `.cursor/rules/core.mdc`, `.cursor/rules/workflow.mdc`

### 6.5 訪問歯科プロダクト方針（2026-08-06 決定 / 2026-08-08 追記）

- Apotool は医院内予約管理の**模倣対象・参照資料**であり、完成形ではない。
- 機能骨格（カレンダー／患者／予約／連絡者などの型）の正本はリポジトリ内 `doc/Apotool管理ツール調査結果_訪問歯科スケジュール自動化.md` とする。
- Apotoolに無い独自価値を中心に実装する: 複数患者の自動割付、ルート最適化、電話確認前提の仮予約→本予約、訪問頻度/次回期限からの対象抽出。
- 主UXは「AIボタンを押す → 1日の訪問スケジュール案が出る」。空き枠を1件ずつ探すUIを主導線にしない。
- 関連: スケジュール自動提案画面、訪問カレンダー、§6.18〜6.20

### 6.6 仮予約 → 電話確認 → 本予約（2026-08-06 決定 / 2026-08-09 追記 / 2026-08-11 改定）

- 自動提案で作る予約は原則「仮予約」。
- 電話確認が必要な患者は連絡リスト化し、結果を OK / NG / 不在 / 折返し待ち / 施設確認待ち 等で記録する。
- **本予約への昇格経路（2026-08-11）**:
  1. 連絡者リストで電話確認 OK → `confirmed`（従来）
  2. 診療カレンダー上の仮予約枠をクリック → `confirmed`（`confirmTentativeVisit`）。pending の電話確認があれば `ok` に同期する
- NG時は次候補を再提案する。
- 連絡者リストとカレンダーを連動させる。
- **手動仮予約も電話確認キューへ載せる**（`ensurePhoneConfirmationForVisit`。患者条件で電話確認不要ならスキップ）。
- **電話確認NGの最小ループ**: 対象訪問を `cancelled` にし、同患者のみ（`onlyPatientIds`）で同日 Day0 再提案を生成・採用する。仮予約のまま残さない。
- 関連: 連絡者リスト（電話確認）、訪問予約ステータス、電話確認ステータス、§6.32, §6.35

### 6.7 自動提案の考慮変数（2026-08-06 決定）

患者条件の正として扱い、画面ごとに独自再計算しない。

- 訪問頻度、訪問種別、医師同行、担当医・担当衛生士
- 訪問可能曜日・時間帯、NG日
- 施設・居宅区分、住所・エリア、同一施設まとめ可否
- 標準診療時間、移動時間
- 電話確認要否・ステータス、優先度
- 前回訪問日、次回訪問期限

### 6.8 ルート最適化の方針（2026-08-06 決定 / 2026-08-08 追記 / 2026-08-11 改定）

> **正の形（2026-08-11・8/10 Apotool実枠で確認）**: 必要台数の**並行ルート** × 各号車の**密な連続配置**。  
> 「1号車に全部寄せる」「同時刻の横並びを絶対禁止する」は**誤り**（§6.48 / §10.19）。

#### 目的関数の優先順

1. 期限・優先度で対象患者を選ぶ（`dueStatus` / `priority`。§6.39）
2. **近接クラスタ（エリア／施設）を号車に割り当て、朝から並行ルートを立てる**
3. **各号車内は移動最小で密に連続配置**する（可変所要＋`travelMinutesMatrix`。固定30分＋一律ギャップの薄い格子にしない）
4. 号車間の移動負担・件数を**平準化**する
5. 余った号車は**空のまま**でよい（無理に7台へ薄く散らさない）

#### 守ること

- エリアごとに患者をまとめる
- 同一施設の患者を連続配置する
- 車両・チームごとの移動負担を平準化する
- 医師同行必須患者を医師出勤枠内に寄せる
- 月1回患者を月内空き日に分散する
- 毎週患者を固定曜日・固定時間に近づける
- **1日ルートは住所（または正規化済み座標）間の距離を根拠に最適化する**（Cursor SDK Cloud 裏処理。§6.10 / §6.16）

#### 「詰める」の定義

- **詰める** = 各号車の稼働帯を、実移動に見合うギャップで縦に密に埋めること
- **詰める ≠** 全件を1〜2号車へシリアル詰めすること
- 同時刻に複数号車がスタートするのは、実運用上の正常形（需要に応じた並行本数）

#### 禁止（割付方針）

- 同時刻横並び禁止を絶対ルールにすること
- 常に1号車からシリアル詰めを SSoT にすること
- 固定スロット長＋一律ギャップだけで「最適化した」とみなすこと

### 6.9 MVP範囲（2026-08-06 決定 / 2026-08-08 追記）

> 最初に出荷する範囲（v0 Must）は §6.19。本節はそれより広い中期MVPの目安。

必須画面: ダッシュボード、訪問カレンダー、患者一覧、患者カルテ、連絡者リスト、スケジュール自動提案、操作ログ、設定。

必須機能の中心: 患者訪問条件登録、手動予約、自動提案（採用/却下/再提案）、電話確認ステータス、操作ログ、日別/チーム別出力。

後段（MVP外の目安）: Medical Box相当の資料管理、SMS/LINE/AI電話の本格契約連携。詳細は要確認。

### 6.10 Cursor SDK による裏処理（2026-08-06 決定）

- スケジュール自動提案・ルート最適化など AI 寄りの裏処理は **Cursor SDK** で実装する（Agent → Run）。
- フロントは起動・進捗・結果表示・採用/却下に寄せる。割付・制約判定・ルート案の生成本体は SDK エージェント側。
- UI や画面コンポーネントに最適化ロジックを埋め込まない。
- SDK 実装時の API 正本は Cursor SDK スキル（`.cursor/skills-cursor/sdk/SKILL.md`）と公式ドキュメント。記憶や古い例だけで API を決めない。
- パッケージは本リポジトリが TypeScript のため `@cursor/sdk` を前提とする。
- **ランタイム分割（確定）**: 開発（このチャット・手元デバッグ）は local。製品・本番のボタン起動は **Cloud**（`cloud` を明示。未指定で local に落とさない）。
- **self-hosted pool / 自前ワーカーは当面不要**。マネージド Cloud を使う。社内閉域・Enterprise 要件が出たら再検討。
- 関連: スケジュール自動提案、ルート最適化、§3 SSoT、§6.12

### 6.11 裏処理の二重実装禁止（2026-08-06 決定）

- Cursor SDK 経路が正の裏処理であるあいだ、同等の自動割付・ルート最適化をフロント / Edge Function / 別 LLM 呼び出しへ再実装しない。
- 追加が必要な場合は SDK 結果を扱う Adapter に留め、計算本体を複製しない。
- 関連: §3 SSoT、architecture-extension.mdc

### 6.12 エージェントのデータ境界・外部連携（2026-08-06 決定 / 2026-08-11 追記）

- **エージェントに Supabase / DB を直結させない。** service_role や DB 接続情報をエージェントへ渡さない。
- アプリ側が割付ジョブ（または同等の中間データ）を用意し、エージェントはそれを読んで構造化結果を書き戻す。正データは Supabase に置き、画面表示用の氏名等はアプリが結合する。
- エージェント入力は割付に必要な制約中心（患者ID、頻度、曜日・時間帯、NG、エリア/施設、診療時間、医師同行、優先度等）。氏名・電話・詳細住所・カルテ丸ごとを原則渡さない（粒度の細部は実装時に詰める）。
- **レセコン等の外部 API は正規化 Adapter 経由のみ。** エージェントがレセコンを直接叩かない。取り込んだデータは訪問条件マスタ等へ正規化してから割付に使う。
- Cloud からツール連携する場合の MCP は **HTTP MCP** を使う。`headers` / `auth` は SDK 経由。stdio MCP の `env` に鍵を載せることは避ける。
- **Cursor Cloud 送信時のコンプライアンス（2026-08-11）**: UUID・制約・距離行列など割付に必要なメタを送る一方、氏名・電話・生住所は載せない方針を維持する。第三者 AI 処理に該当しうるため、DPA / プライバシーポリシー / 利用者同意の文書化を必須とする（漏洩経路というより処理記録の論点）。
- 関連: §6.10、Supabase、レセコン連携、スケジュール自動提案、§6.13, §6.39

### 6.13 精度最優先: 知識ではなく制約を貯める（2026-08-06 決定 / 2026-08-11 改定）

ゴールは精度。導入ナレッジの百科事典化はしない。

- **正データは構造化制約マスタ**（不在・NG・可能枠など）。「知識を覚えさせる」のではなく「制約を貯める」。
- デイサービス等のクリニック固有事情は、物語や自由記述Wikiではなく `patient_id + 曜日/時間帯のNG（または不在）` として持つ。事情の説明文はハード制約にしない。
- **導入 Day0 は最小入力で仮案を出せる**設計にする（頻度・可能曜日・施設/エリア等）。全患者の全事情の事前入力を必須にしない。
- **精度エンジンは電話確認**: NG理由から制約候補を出し、**人の確認後**に恒久制約へ昇格する。確認なしの自動確定はしない。
- レセコン/CSV の種まきは頻度・施設・前回日等に限定する。事情本文をハード制約にしない（正規化 Adapter 経由は §6.12）。
- **禁止**: クリニック長文ナレッジをエージェント精度の主源にすること。自然文メモや AI 抽出を、確認なしでハード制約化すること。

#### ゴールデン日からの学習（2026-08-11）

- Apotool 等の**実運用日**は評価・方針の正本になりうる（例: 2026-08-10）。ただし Wiki 化せず、次の**構造化シグナル**に落とす（§6.48）。
  - 並行号車数（使った台数／空けた台数）
  - 号車内密度（件数・所要のばらつき・ギャップ分布）
  - エリア／施設の束
  - 例外枠（初診・医師同行・取消）は別制約として扱う
- 見た目の色や「遅」バッジを割付精度の主源にしない。
- 関連: §6.6、§6.7、§6.8、§6.12、§6.48、連絡者リスト、制約マスタ、オンボーディング

### 6.14 モデルカスケード（実装は後続・2026-08-06 方向）

製品の Cursor SDK 裏処理で使うモデルの段階切替方針。実装は先送り、方向性のみ確定。

- **0〜50%**: ベースモデル = Grok 4.5
- **50%超〜99%**: Composer 2.5
- **100%**: other = GPT 5.6 Sol
- 閾値の「%」は Cursor モデルプラン相当の使用率を指す。取得元（Dashboard API 等）が公式で読めるかは要確認。読めない場合は自前の月次トークン/金額メータで閾値を再現する。
- **切替はアプリ側のモデルルーター**で行い、`Agent.create` / `prompt` 前に `model` を選ぶ。Cursor IDE/SDK の limit 時自動フォールバックに任せない（公式にこのカスケード設定はない）。
- モデル ID はハードコード前に `Cursor.models.list()` で実 ID を確認してから固定する。
- **手動切替（2026-08-13）**: カスケード実装前は運営画面で 1 モデルを選ぶ。許容と既定は §6.53。`grok-4.6` を本節の帯（0〜50% 等）に組み込まない。
- 関連: §6.10、Cursor SDK Cloud、スケジュール自動提案、§6.53

### 6.15 ログインIP・認証監査（2026-08-08 決定 / 2026-08-12 改定）

- 「誰が・いつ・どこからログインしたか」を追跡する。正は `auth_audit_logs`。
- 記録経路: `log_auth_audit_event(p_event, p_clinic_id default null)`（SECURITY DEFINER）。イベントは当面 `login_success` / `logout`（失敗は後段可）。
- 記録項目: `user_id`, `clinic_id`（検証付き）, `event`, `ip`, `user_agent`, `created_at`, `metadata`。
- **クリニック紐付け（2026-08-12）**:
  - `clinic_id` は選択中クリニック（`dentacle.activeClinicId`）を渡すが、所属 or 運営のみ採用。未指定で所属1院なら自動採用。
  - `metadata.memberships` にログイン時点の所属スナップショット（`clinic_id` / `clinic_name` / `role`）を保存する。過去ログは空のまま。
  - 一覧は「選択クリニック」「所属クリニック」列で表示する。
- **IP / UA は PostgREST `request.headers` から取得する。** ブラウザから送った IP 文字列を正としない（改ざん防止）。
- **端末表示**: 生 UA を主表示にしない。`formatAuthAuditDeviceLabel` で「パソコン · Mac · Chrome」等に要約し、ホバーで生 UA。
- **閲覧は運営（`is_platform_admin()`）のみ**（院 admin は見ない）。
- **閲覧UI**: サイドバー「ログイン監査」`/auth-audit`（`requiresPlatformAdmin` + `PlatformAdminRoute`）。業務の操作ログ（`/operations`・§6.50）とは画面・テーブルを分けたままにする（混ぜない）。
- **推定地域（2026-08-12）**: 表示時に IP から国・都道府県程度を GeoIP（`ipwho.is`）で推定し表に出す。緯度経度は保存しない。VPN・回線でずれる旨を画面注記する。証拠としては弱い目安。
- **日本地図UI（2026-08-12）**:
  - 正アセットは `public/icon/map-full.svg`（Geolonia japanese-prefectures / GFDL）。簡易シルエットを増やさない。
  - 都道府県は `data-code` で塗り分け。件数バッジ。海外は異常強調。座標は DB 非保存（都道府県代表点でピン）。
  - **画面は Select 切替**: 「推定ログイン位置」↔「認証イベント一覧」↔「現在ログイン中」。同時表示しない。初期は地図。都道府県クリックで一覧へ自動切替＋絞り込み。地図は非表示時もマウント維持。
  - **件数表示**: サイドの海外／推定不可カードや凡例ピルは置かない。地方チップ行の右端に `国内 N` / `海外 N` の簡潔テキストのみ（海外は件数>0で一覧絞り込み可）。
  - ズーム: デフォルトはデータがある都道府県へフィット（データ範囲）。地方チップ（北海道〜九州沖縄）／全国。都道府県クリックの一覧切替は維持。
  - **九州・沖縄ズーム**: Geolonia は沖縄・鹿児島離島をインセット描画するため、全体外接だと全国並みにズームアウトする。`zoomSelector` で本土のみ＋南方向の余白拡張（§10.28）。
- **ハートビート在席（2026-08-12）**:
  - 正は `auth_presence`（ユーザー単位 PK）。`touch_auth_presence` / `list_auth_presence` / `clear_auth_presence`。
  - ログイン中クライアントが約20秒ごとに心拍（タブ非表示中は停止、復帰で即送信）。ログアウト時に行削除。
  - 運営UI「現在ログイン中」は直近60秒以内を在席とし、20秒ポーリングで更新。有効セッション一覧（Auth sessions）とは別物。
- **IPブロック（2026-08-12）**:
  - 正は `auth_ip_blocks`（運営のみ RLS）。`block_auth_ip` / `unblock_auth_ip` / `is_request_ip_blocked`。
  - 一般ユーザーはログイン直後・MFA完了後に拒否（`signOut`）。**運営はロックアウト回避のためバイパス**。
  - 監査一覧から手動ブロック／解除できる。完全な Edge 強制ではない（クライアント＋RPC 判定）。
  - **IPの意味**: 記録・ブロック対象は回線の出口（グローバルIP）。Mac等の端末単体番号ではない。同じWi‑Fiの別端末でも一致しうる。ブロック確認文言で別端末照合と回線共有影響を案内する（`formatAuthIpBlockConfirmMessage`）。
- ログイン系監査と業務操作ログ（`operation_traces`）はテーブル/責務を分離する。
- エージェント（Cursor SDK）経路に監査テーブルを直結させない（§6.12）。
- 関連: `recordAuthAudit.ts`, `authPresence.ts`, `AuthAuditPage.tsx`, `AuthPresencePanel.tsx`, `AuthAuditJapanMap.tsx`, `japanMapZoom.ts`, `formatAuthAudit.ts`, `formatAuthIpBlock.ts`, `lookupIpRegion.ts`, `navConfig.ts`, `public/icon/map-full.svg`, `20260812151000_auth_audit_platform_admin_only.sql`, `20260812160000_auth_audit_clinic_and_ip_blocks.sql`, `20260812170000_auth_presence_heartbeat.sql`, §6.29, §6.50, §7, §10.27, §10.28

### 6.16 距離算出とルート最適化の責務（2026-08-08 決定 / 2026-08-11 改定）

- 1日の訪問ルート最適化は Cursor SDK（Cloud）で行う。
- **住所→座標 / 距離行列の算出はアプリ側 SSoT（`src/utils/schedule/travelDistance.ts`）** で行い、割付ジョブの `travelMinutesMatrix` に載せる（§6.39）。
- 座標は施設の lat/lng を使う。無い場合は同一施設 / 同一エリアのヒューリスティック（地図 API 未接続時の暫定）。
- エージェントは距離付きスナップショットを読んで訪問順を最適化する。**生住所文字列はスナップショットに載せない**（§6.12）。地図 API 鍵や DB 直結をエージェントに渡さない。
- §6.8 のエリアまとめ・同一施設連続配置と併用する。
- 関連: `travelDistance.ts`, `buildProposeSnapshot.ts`, §6.8, §6.10, §6.12, §6.39, 割付ジョブ

### 6.17 サービス名「デンタクル」（2026-08-08 決定 / 2026-08-11 改定）

- 本システムの対外・画面向けサービス名は **デンタクル**（カタカナ）とする。
- プロジェクト／内部識別子の正は **`Detacle`**（旧称 `home_dental_care` は使わない）。ブランド表記（デンタクル）と内部識別子（Detacle）を混同しない。
- 表記の正はカタカナ「デンタクル」。英語併記が必要な場合のみ副表記（`Detacle`）とし、主表記はカタカナのまま。装飾英語の見出しを増やさない（`ui-language.mdc`）。
- SEO・提案書の検索語はサービス名に詰め込まず、説明文・サブタイトルで取る。例: `デンタクル｜訪問歯科のスケジュール自動化`。
- UI文言・提案資料・ドメイン検討などでサービス名を出すときはデンタクルに統一する。
- 関連: §1, UIコピー, 提案資料, SEO

### 6.18 機能ベースと導入レーン（2026-08-08 決定）

- **機能ベース**: Apotool調査の骨格（§6.5 / `doc/Apotool管理ツール調査結果_訪問歯科スケジュール自動化.md`）＋独自価値（ボタン1つでの複数患者割付・ルート最適化・仮予約→電話確認→本予約）。
- 導入は入口だけ違う **2レーン**。ゴールはどちらも「Day0で仮案が1本出せる」こと（§6.13）。
  - **立ち上げクリニック**: クリニック設定（チーム/車両/担当/稼働枠）→ 患者は手入力で少数から → 最小制約（頻度・可能曜日・施設orエリア・担当医）→ 仮案 → 電話確認で制約育成。
  - **既存クリニック**: 上記設定のあと、CSV種まき（§6.20）→ 取れる列だけ埋める → 空欄は仮制約で仮案可 → 電話確認で制約育成。
- 共通禁止: 全患者の全事情の事前入力を必須にしない。CSV取込完了を導入完了とみなさない。
- 関連: §6.13, §6.19, §6.20, オンボーディング

### 6.19 v0初期機能（Mustのみ・2026-08-08 決定）

最初のリリース／デモ導入で入れる機能は次に限定する（§6.9の中期MVPより薄い）。

- ログイン / クリニック単位の分離
- 設定（チーム・担当・稼働枠）
- 患者一覧 + 患者カルテ（最小項目）
- 訪問カレンダー（日別・チーム列）
- 手動予約（作成・移動・取消）
- スケジュール自動提案（ボタン1つ）と採用 / 却下 / 再提案
- 連絡者リスト + 電話確認ステータス → 本予約化

患者カルテの Day0 最小項目: 氏名、カルテ番号（任意）、担当医、訪問頻度（仮可）、可能曜日（仮可）、施設orエリア（ざっくり可）、前回訪問日、住所。
**2026-08-11 改定**: カレンダー自動提案（SDK Adapter）の割付対象は **住所必須**（§6.39）。住所未登録は対象外。Day0 入力のハードルを下げる話と、距離根拠付き自動割付の対象条件を混同しない。

**v0では入れない（後段）**: リッチなダッシュボード本画面、Medical Box、SMS/LINE/AI電話、Web予約、掲示板、シフト本格、技工物、分析、Excel/印刷フル、操作ログ本格UI、日別/チーム別のきれいな帳票。操作の裏traceは残してよい。

**2026-08-09 前倒し（簡易版のみ）**: 操作ログの簡易一覧UI（`/operations`）と日別CSVの簡易出力は、本格帳票・本格監査UIではなく運用摩擦低減として v0 に入れる（§6.32）。きれいな帳票・高度な監査は後段のまま。

- 関連: §6.5, §6.9, §6.18, §6.32

### 6.20 テストデータ種まき（`doc/患者データ.csv`・2026-08-08 決定）

- 開発・デモの患者種まきソースは `doc/患者データ.csv` とする（既存クリニック導入の模擬にも使う）。
- 投入は正規化 Adapter 経由のみ（§6.12）。レセコン直結禁止。
- 初期マッピング対象の目安: カルテ番号、氏名（漢字/カナ）、主担当医、最終日付（前回訪問日の種）。請求・点数など会計列は初期は無視してよい。
- CSVに無い前提の項目: 住所、施設、エリア、訪問頻度、可能曜日、NG、医師同行、連絡先 → 後追い入力 / 電話確認で育成。
- **住所の正（2026-08-11）**: `doc/患者データ.csv`（レセコン個人別全集計）には住所列がない。住所は Apotool の患者編集（`/user/patient/edit`）の住所1/2を正とし、診察券番号＝`registration_number`＝`chart_number` で突合して `patients.address` へ反映する（§6.49）。
- **CSVは訪問条件の完成データではない。** 取込完了＝導入完了とみなさない（§6.18）。
- MEMORY・コミットメッセージ・Issue に患者の氏名・カルテ番号などの個人情報を転記しない。開発利用時のマスキング／サンプリング方針の細部は要確認。
- Adapter検証は実CSVでも**件数のみ**報告する。DBへ書き込むデモ・E2Eは合成CSV（`[TEST]`接頭辞・カルテ番号は数字のみ）を優先し、実個人情報をリモートDBへ広げない。
- 関連: `doc/患者データ.csv`, §6.12, §6.13, §6.18, §8.3, §10.3

### 6.21 ログイン画面UI（2026-08-09 決定 / 2026-08-11 改定 / 2026-08-12 追記）

- パスワード入力には表示/非表示トグルを付ける。Lucide等の禁止アイコンは使わずインラインSVG。`aria-label` は日本語（例: 「パスワードを表示」「パスワードを隠す」）。
- 見出し下の説明文は置かない。補足コピーを増やさない。
- レイアウト: **カード外上部にブランド枠（緑「デ」＋「デンタクル」）は置かない**（2026-08-11）。カード内の先頭に「ログイン」（左寄せ）→ メール → パスワード。フッター注意文は改行して2行。
- 「ログイン」見出しの左隣にブランド色（`#008C01`）の縦アクセント線を置く。
- ブランド表示はログインカード外ではなく、ログイン後のサイドバー／ヘッダー側（§6.24）を正とする。ログイン画面に装飾用のサービス名テキストを増やさない。
- **背景（2026-08-11）**: 画面背景は真っ白（`#FFFFFF` / `bg-white`）。緑の全面色・幾何パターンは置かない。カードは境界線で面を分ける。
- **余白（2026-08-11）**: カード内は広め（目安 `px-10 py-12` 以上、見出し下 `mb-10`、フィールド間 `space-y-8`、ラベル〜入力 `space-y-3`、主ボタン前に一段余白、フッター上 `mt-10`）。入力は `py-4` 前後。詰めすぎない。
- **MFA確認コードUI（2026-08-12）**: 運営 TOTP の確認／登録コードは横長1欄にしない。**6マス分割**（`OtpCodeInput`）。コピペした6桁は各マスへ展開する（数字以外は除去）。enroll / challenge とも同じコンポーネントを使う（§6.29）。
- **MFA中の画面切替（2026-08-12）**: セッションがあるあいだはメール・パスワード画面へ戻さない（§10.26）。ゲート解決中は待ち表示。
- 関連: `src/pages/Login/LoginPage.tsx`, `OtpCodeInput.tsx`, `MfaChallengePanel.tsx`, `MfaEnrollPanel.tsx`, §6.17, §6.24, §6.29, §10.26, `ui-language.mdc`

### 6.22 開発用Auth運用（2026-08-09 決定）

- 開発・デモでは Supabase Auth のメール確認をオフにするのを推奨。オンのままだと signUp 直後に session が発行されず、所属作成RPC等が permission denied になる（§10.5）。
- 開発用ログインユーザーは `y.nishimura@leanstack.co.jp`。**パスワードは MEMORY・コミット・Issue に書かない。**
- 検証用に作った他の Auth ユーザーは残さず削除する運用とする。
- 関連: Supabase Auth, §8.3, §10.5, ログイン

### 6.23 基本フォント Zen Maru Gothic（2026-08-09 決定）

- アプリ基本フォントは `"Zen Maru Gothic", sans-serif`。
- 本文既定: `font-style: normal` / `font-weight: 500` / `font-size: 14px` / `line-height: 20px` / `color: rgb(17, 24, 39)`。
- Google Fonts で読み込み。見出し階層用に 400/700/900 も可。
- 関連: `index.html`, `src/index.css`, `tailwind.config.js`

### 6.24 アプリヘッダー（アカウントメニュー・ロゴ枠）（2026-08-09 決定 / 2026-08-10 改定）

- ヘッダー右はクリニック名ピル＋右端の▼アカウントメニューとする。
- メニュー項目: マイページ／ユーザー管理（追加・編集・削除）／契約者情報／お支払い履歴／契約情報／ログアウト。
- ヘッダーに単独のログアウトボタンを置かない。
- ルート: `/mypage`・`/users` は実装画面。契約者情報・お支払い履歴・契約情報は当面 stub「準備中」で導線のみ先に用意する。
- **業務ナビはヘッダー横並びではなく左サイドバー**（§6.33）。ヘッダーはクリニック名ピル＋ページ見出し帯（`titleAside` / `actions`）を主とする。
- ブランド「デンタクル」はテキストのみ（緑背景の角丸プレースホルダは置かない）。枠内に「デ」等の仮文字も置かない。将来ロゴ差し替え時は画像/SVG、`alt` は「デンタクル」。
- ブランド配置: サイドバー表示中はサイドバー上部。サイドバー非表示時・md未満はヘッダー左に出す（モバイルでブランドが消えないようにする）。
- 関連: `src/components/layout/DashboardLayout.tsx`, `AppSidebar.tsx`, `AccountMenu.tsx`, `ClinicSwitcher.tsx`, `App.tsx`, `src/pages/Account/*`, §6.33, §10.6

### 6.25 ユーザー管理画面（2026-08-09 決定 / 同日改定 / 2026-08-11 追記）

- `/users`（および所属管理と同系UI）の並び: タイトル「ユーザー管理」→ コンパクト検索（`titleAside`）→「クリニックを作成」→「メンバーを招待」。
- 役割フィルタ・状態フィルタ／状態列／幅広フィルタ帯は置かない。一覧は `clinic_members.status = active` のみ。
- メンバー表＋ページネーション。1ページは `MEMBERS_PAGE_SIZE = 10` 固定（件数セレクトなし。11人目から次ページ）。
- メンバー招待は右ドロワー、クリニック作成はモーダル。
- オーナー行は操作ロック（鍵のみ）。非オーナーは「編集」（役割変更）のみ。削除／無効化UIは当面置かない。
- **DB 強制（2026-08-11）**: UI ロックだけでは足りない。`clinic_members` の RLS で owner 行の UPDATE/DELETE を禁止し、owner 昇格も WITH CHECK で拒否する（§6.40）。
- 「招待を送信」はメール送信ではなく `add_clinic_member_by_email`（既存 `profiles` ユーザーの所属追加）。未登録時は先にアカウント作成が必要と案内する。**招待 RPC で `owner` 役割は付けない**（owner は `create_clinic_with_owner` / bootstrap のみ）。
- 最終ログイン列はクライアントから取得可能になるまで「—」表示とする。
- 関連: `src/pages/Members/*`, `DashboardLayout`（`titleAside`）, RPC `add_clinic_member_by_email`, §6.24, §6.26, §6.40

### 6.26 セレクトは独自UI（2026-08-09 決定）

- 画面上のセレクトは必ず `src/components/ui/Select.tsx` を使う（丸角メニュー・薄い境界・影・選択項目左にチェック・portal 配置）。
- 見た目用のネイティブ `<select>` を新規追加しない。フォーム送信・required 用の sr-only 同期のみ例外。
- 関連: `Select.tsx`, §10.6（親の overflow-hidden でメニューを消さない）

### 6.27 お支払い履歴（銀行振替・縦タイムライン）（2026-08-09 決定）

- お支払い手段は銀行振替を想定する。カード決済前提のUI・文言にしない。
- `/account/payments`（お支払い履歴）の表示は、縦軸タイムライン形式とする（左に日付／中央に縦棒＋ノード／右に内容パネル）。表一覧やカード並びだけで代替しない。
- 当面は stub「準備中」のままでよいが、本実装時は上記方針を崩さない。
- 関連: `src/pages/Account/AccountStubPage.tsx`（`PaymentHistoryPage`）, §6.24

### 6.28 契約者情報・契約情報（2026-08-09 決定 / 2026-08-12 改定）

- `/account/contractor`（契約者情報）の表示項目: 法人名／代表者名／郵便番号／都道府県／住所／電話番号／ログイン用メールアドレス／請求書送付用メールアドレス。
- `login_email` は契約プロフィール上の独立フィールド（auth / 個人の `profiles.email` と自動同期しない）。
- 契約者情報の編集（書込）は運営（`platform_admins`）のみ。クリニック会員は閲覧のみ（RLSも運営のみ書込）。
- **運営向け編集UI（2026-08-12）**: 見出し右に「編集する」→ フォーム＋「保存する／キャンセル」。未登録行は `clinic_id` キーで upsert。非運営には編集ボタンを出さない。
- `/account/contract`（契約情報）は締結PDFのアップロード／閲覧形式とする。運営のみアップロード・差し替え、クリニックは閲覧（未登録時は空状態）。
- 正データ: `clinic_contractor_profiles`（クリニック1:1）、`clinic_contract_documents`（有効PDFはクリニックあたり1件）、Storage バケット `clinic-contracts`（パス `{clinic_id}/{document_id}.pdf`）。
- §6.24 の「契約者情報・契約情報は stub」は本項で上書き（お支払い履歴のみ stub 継続可）。
- 関連: `ContractorInfoPage.tsx`, `ContractorInfoForm.tsx`, `useContractorProfile.ts`, `ContractInfoPage.tsx`, `supabase/migrations/20260809120000_clinic_contract_accounts.sql`, §6.29

### 6.29 プラットフォーム運営（スーパー権限）（2026-08-09 決定 / 2026-08-11 追記 / 2026-08-12 改定）

- デンタクル運営は `platform_admins`。クリニックの `owner` / `admin` とは別レイヤー。
- 開発用ログイン `y.nishimura@leanstack.co.jp`（§6.22）は運営として扱う。**クリニック owner にしない。`clinic_members` に載せない**（ユーザー管理一覧に出さない）。
- `is_clinic_member` / `is_clinic_admin` は `is_platform_admin()` を含む（所属行なしで全クリニックの RLS アクセス可）。
- ヘッダーのクリニック切替UI（▼一覧）は運営のみ。一般ユーザーは所属クリニック名の表示のみ（切替なし）。
- ユーザー管理: 一覧から `platform_admins` を除外。`add_clinic_member_by_email` は運営アカウントの所属追加を拒否。
- **クリニック作成（S-10）**: `create_clinic_with_owner` と `clinics` INSERT は **運営のみ**。一般ユーザーは作成不可。UIの「クリニックを作成」も運営のみ。運営作成時は owner 所属を作らない。
- **運営 TOTP MFA（S-03）**: 運営はログイン後に Authenticator 登録／確認が必須（AAL2）。一般スタッフはパスワードのみ。詰まったときの本人復旧は当面 Supabase Dashboard。運営が複数になったら「他運営の MFA 解除」API/UI を後付けする。確認コードUIは §6.21（6マス＋コピペ一括）。
- **ログイン監査ナビ**: `/auth-audit` は運営のみ表示・閲覧（§6.15）。操作ログ（§6.50）と統合しない。
- **RLS 強制（2026-08-11）**: bootstrap owner INSERT に `not is_platform_admin()`。直接 INSERT/UPDATE でも `is_platform_admin_user(user_id)` で運営ユーザーの所属化を拒否する（§6.40）。
- 関連: `ClinicProvider.tsx`, `ClinicSwitcher.tsx`, `MembersPage.tsx`, `MfaGateRoute.tsx`, `LoginPage.tsx`, `20260809123000_platform_admin_clinic_access.sql`, `20260811160000_clinic_members_rls_hardening.sql`, `20260812150000_clinic_create_platform_admin_only.sql`, §6.15, §6.22, §6.25, §6.28, §6.40

### 6.30 カレンダー日付ナビ（タイトル右隣・横並び）（2026-08-09 決定）

- 年月日表示・前へ／本日／次へ・日付入力・表示列説明は、訪問号車グリッドの上や右サイドに独立セクションを置かない。
- `DashboardLayout` の `titleAside` に横並びで置く（ユーザー管理の検索と同じパターン）。
- 「カレンダーの右隣」はグリッド本体の右ではなく、タイトル「カレンダー」の右隣を指す（§10.7）。
- コンポーネント: `src/pages/Calendar/components/CalendarDateControls.tsx`。
- 関連: `CalendarPage.tsx`, `DashboardLayout`（`titleAside`）, §6.25, §10.7

### 6.31 患者管理（ナビ▼・一覧／電話確認・灰ピル）（2026-08-09 決定 / 2026-08-10 改定）

- 領域名は **患者管理**。サイドバー表記・ページ見出しに使う。
- 患者マスタ（`patients`）と電話確認（`visit_phone_confirmations`／旧「連絡者」）は**データ統合しない**。ナビは「患者管理」1つにまとめ、**サイドバー内アコーディオン**で「患者一覧」「電話確認」を切り替える（タイトル横セレクトは使わない。横に飛び出すポップアップ▼は使わない）。
- 選択中はアコーディオンを自動展開する。`/contacts` ルートは維持。ナビの「患者管理」は `/patients` と `/contacts` の両方で選択中表示（`isNavItemActive`）。
- **開閉の保持（2026-08-11）**: 他ナビへ遷移しても開閉状態を維持する（`sessionStorage` キー `dentacle.sidebar.navOpen:*`）。手動で閉じた場合も保持。配下ルートにいるときは自動で開く。
- 患者一覧右上アクション: 「データ出力」「新規患者登録」。どちらも灰色丸ピル（`Button` variant `soft`）。データ出力は表示中一覧のCSV。
- 関連: `navConfig.ts`, `SidebarNav.tsx`, `PatientsPage.tsx`, `ContactsPage.tsx`, `exportPatientsCsv.ts`, §6.33, §10.8

### 6.32 カレンダー運用（ドラッグ調整・電話確認連携・運用補助）（2026-08-09 決定 / 2026-08-11 追記）

訪問カレンダーは Apotool 風の日別×号車グリッドを土台に、次を v0 で守る。

- **ドラッグ移動・リサイズ**: 訪問ブロックをドラッグで号車・時刻を変更し、下端ハンドルで終了時刻を変更する（`DayVisitGrid` / `visitTimeMath`）。詳細モーダルの「更新」なしでも即反映する。
- **楽観更新 + silent reload（2026-08-11）**: 移動・リサイズ後はローカルパッチし、`load({ silent: true })` で再取得する。`setVisits([])` で枠を空にしない（§10.16）。
- **手動仮予約 → 電話確認**: 手動登録でも `ensurePhoneConfirmationForVisit` により電話確認キューへ載せる（§6.6）。
- **電話確認NG → 取消＋同日再提案**: NG時は訪問を取消し、同患者のみの Day0 再提案を自動採用する最小ループ（§6.6）。
- **運用補助**: 日別メモ（`clinic_day_memos`）、空きブロック（`calendar_blocks`: 休憩・移動・会議等）、電話未確認／当日取消の見える化、簡易週ストリップ、患者絞り込み、標準所要時間の手動登録時適用、操作ログ簡易UI（`/operations`・§6.50）、稼働枠サマリー表示。
- **日別CSV（2026-08-11 改定）**: カレンダー見出し操作からは外す（主導線ではない）。患者一覧の「データ出力」・CSV取込は別導線として維持。
- **カレンダーからの自動提案実行**: §6.34。空き枠埋め副導線は §6.47。
- 操作の裏書きは `operation_traces` に残す（失敗しても業務処理は止めない）。
- 関連: `CalendarPage.tsx`, `DayVisitGrid.tsx`, `useCalendarDayData.ts`, `useCalendarVisitActions.ts`, `ContactsPage.tsx`, `proposalActions.ts`, `OperationsTracesPage.tsx`, `supabase/migrations/20260809140000_calendar_ops_extensions.sql`, §6.6, §6.19, §6.30, §6.34, §6.47, §6.50

### 6.33 左サイドバー業務ナビ（表示切替・ドロワー・アイコン）（2026-08-10 決定 / 2026-08-11 改定 / 2026-08-12 追記）

- 業務ナビ（診療カレンダー／自動提案／患者管理／操作ログ／ログイン監査／設定）は**画面左端の縦サイドバー**に置く。上部横並びナビは廃止。
- md以上: 幅 `w-56` の固定サイドバー。ヘッダー右のクリニック名ピル＋▼アカウントメニューとページ見出し帯（§6.24 / §6.30）は維持。
- **表示切替**: `/icon/grid.png`。表示中はサイドバー上部「デンタクル」の**右隣（行末寄り・幅を空けて）**に置く。非表示時はヘッダー左に同アイコンを出し、押すと再表示。md未満は同アイコンで左ドロワーを開く（ESC・背景クリック・画面遷移で閉じる）。
- **自動提案アイコン**: サイドバー「自動提案」とカレンダー「自動提案」ボタンの文字左に `/icon/ai.png`。見た目は `brightness-0` + `opacity` で灰色。
- **その他ナビアイコン（2026-08-11 / 2026-08-12）**: 診療カレンダー=`/icon/calendar.png`、設定=`/icon/gears.png`、患者管理=`/icon/patient.png`、操作ログ=`/icon/windows.png`、ログイン監査=`/icon/audit.png`（運営のみ・§6.15 / §6.29）。選択時緑・通常灰のマスク着色は既存 `NavIcon` と同じ。
- **サイドバー「自動提案」（`/proposals`）は運営（`platform_admins`）のみ表示**（`requiresPlatformAdmin`。§6.34 / §6.35）。AI利用状況は別ナビにせず、同ハブ内で切替（§6.46）。
- ナビ項目定義の正は `navConfig.ts`（`APP_NAV` / `isNavItemActive`）。描画は `AppSidebar.tsx` / `SidebarNav.tsx`。
- `NavDropdown.tsx` は上部ナビ廃止により未参照。`safety.mdc` に従い承認なしでは削除しない（削除はユーザー明示時のみ）。
- 関連: `DashboardLayout.tsx`, `AppSidebar.tsx`, `SidebarNav.tsx`, `navConfig.ts`, `CalendarPage.tsx`, `public/icon/grid.png`, `public/icon/ai.png`, `public/icon/calendar.png`, `public/icon/gears.png`, `public/icon/patient.png`, `public/icon/windows.png`, `public/icon/audit.png`, §6.15, §6.24, §6.29, §6.31, §6.34, §6.35, §10.9

### 6.34 カレンダー自動提案は遷移せずその日を一括実行（2026-08-10 決定 / 同日改定 / 2026-08-11 改定）

- カレンダー右上の **「自動提案」** は `/proposals` や設定画面へ遷移しない。**確認モーダルは出さず、押下ですぐ実行**する。
- **カレンダー主導線の実行経路（2026-08-11 / 同日改定）**: `runCalendarAutoPropose` → `POST /api/schedule/propose` → スナップショット作成 → **Cursor SDK（既定）** → `packProposeSlots`（号車内密正規化）→ 精度ゲート（§6.37）→ 仮予約書き戻し。フロントで割付本体を再実装しない（§6.11）。
- **割付エンジン `PROPOSE_ENGINE`（2026-08-11 再改定）**: 既定 **`cursor`**＝Cursor SDK。`auto`＝SDK 優先・失敗/0件時のみローカル決定論。`local`＝速度検証用の決定論のみ。
- **方針の渡し方（2026-08-11 再改定・精度重視）**: 実行時に **`PROJECT_MEMORY.md` の割付関連節を自動抽出**して Cursor プロンプトへ埋め込む（`loadProposeMemorySections.ts`。節リストは `PROPOSE_MEMORY_SECTION_IDS`）。MEMORY 全文や UI/権限など無関係節は載せない（§6.13 と両立）。読めない環境だけ `proposePolicy` の要約フォールバック。**.cursor/rules 全文は渡さない**（開発用ルールが混ざると割付精度が落ちる。割付の記憶は MEMORY に集約する）。データは圧縮スナップショット（疎距離行列・生住所なし）。
- **節の追加**: 自動提案の改善を MEMORY に書いたら、必要なら `PROPOSE_MEMORY_SECTION_IDS` に節番号を足す（例: 新設 `6.49`）。
- **Day0 ローカル**（`generateAndAdoptDay0ForDate` / `model: day0-local`）は、電話確認 NG 後の同日再提案など**補助経路で当面残す**。カレンダー主導線の正は SDK Adapter 経路。
- **号車への載せ方（2026-08-11 改定）**: ラウンドロビンで薄く横展開しない。エージェントが作った**号車別ルート**を尊重し、各号車内を密に正規化する（§6.8 / §6.48）。同時刻の複数号車スタートは禁止しない。登録される予約は仮予約（§6.6）。本予約にはしない（確定は §6.35）。
- 実行中のUI: ヘッダー・日付ナビなど外枠はそのまま。**`DayVisitGrid` の中身だけスケルトン**（`loading`）。ボタン文言は「提案中…」にし連打を防ぐ。
- 実行権限: オーナー / 管理者 / コーディネーター（および運営）。権限不足時はトーストで案内。
- **提案をクリア（2026-08-11）**: 当日の `auto_proposal` × `tentative` を一括 `cancelled`（キャンセルリストに残る）。**本予約（`confirmed`）は対象外**。確認は `window.confirm` ではなく近傍ポップオーバー（`ClearAutoProposalsConfirm` + `useAnchoredPopover`）。
- **一括確定（2026-08-11）**: 当日の自動提案仮予約を一括 `confirmed`（`ConfirmAutoProposalsConfirm`）。電話確認同期は背面。
- **ヘッダー操作群（2026-08-11 再改定）**: 日付ナビ／日別メモ等と「提案をクリア〜自動提案」は **`titleAside` 内の1本の flex 行**（`gap-3`）にまとめる。`DashboardLayout` の `actions` に右端寄せすると空隙や画面外切れが起きる。見出し帯は `flex-nowrap`＋必要時 `overflow-x-auto`。空タイトル時のレイアウトは §10.20 / §10.21。
- **自動提案ボタン**: アイコンと文言は `inline-flex` の1グループで密着させる（共通 `Button soft` の gap で中央が空きすぎないようにする。§10.22）。
- **空振り時**: 候補0のトーストに「空きを埋める」への案内を付けてよい（§6.47）。主導線を空き枠探しばかりにしない（§6.5）。
- **`/proposals` は運営（`platform_admins`）専用**（ナビ非表示＋`PlatformAdminRoute` で直URL拒否）。履歴・個別の採用／却下の監査用。クリニック一般ユーザーの主導線は診療カレンダー。
- `AiProposeConfirmModal.tsx` は未使用。承認なしでは削除しない（`safety.mdc`）。
- 関連: `CalendarPage.tsx`, `runCalendarAutoPropose.ts`, `ClearAutoProposalsConfirm.tsx`, `ConfirmAutoProposalsConfirm.tsx`, `DashboardLayout.tsx`, `server/schedule/runProposeJob.ts`, `api/schedule/propose.ts`, `DayVisitGrid.tsx`, `proposalActions.ts`, `PlatformAdminRoute.tsx`, §6.6, §6.8, §6.10, §6.29, §6.32, §6.33, §6.35, §6.36, §6.37, §6.47, §6.48, §10.20〜10.22

### 6.35 自動提案の仮枠UIとクリック確定（2026-08-11 決定 / 同日追記）

- 自動提案で載った枠は **仮予約のままカレンダーに表示**する（即本予約にしない）。
- **見た目**: `source === 'auto_proposal'` かつ `status === 'tentative'` の枠は点線ボーダー（`visitBlockAppearance.ts`）。ラベル例:「仮（クリックで確定）」。
- **左の濃い緑アクセントバーは置かない**（本予約の `borderLeft` 号車色バーも廃止）。薄い緑背景＋細枠のみ。
- **下端リサイズハンドル**: 常時の緑バーを出さない。通常は透明。ホバー時も目立つ緑／灰バーを出さない（§10.17）。
- **操作**: 仮予約（`tentative`）枠をクリックすると本予約（`confirmed`）へ更新する（`confirmTentativeVisit`）。本予約枠のクリックは詳細モーダル。
- **クリック確定の即時反映**: 先にローカルで `status=confirmed` し、DB更新後は全件 reload しない。電話確認 `pending→ok` は背面同期。
- **クリックとドラッグの分離**: `pointerDown` だけでは移動プレビューを出さない。`moved === true` のときだけ移動中オーバーレイ（§10.15）。移動しなければクリック確定を維持。
- 確定時、当該訪問の電話確認が `pending` なら `ok` に同期する（§6.6 の昇格経路2）。
- ドラッグ移動・リサイズは従来どおり（§6.32）。
- 関連: `visitBlockAppearance.ts`, `DayVisitColumnBody.tsx`, `DayVisitGrid.tsx`, `CalendarPage.tsx`, `useCalendarVisitActions.ts`, §6.6, §6.34

### 6.36 Cursor SDK 基盤の配置（2026-08-11 決定 / 同日追記）

- アプリ側入口: `server/cursor/*`（設定・runtime・`runCursorAgentPrompt`）と Vercel / 開発用 API（`api/cursor/health.ts`、割付は `api/schedule/propose.ts`）。
- **Private のあいだ** `CURSOR_RUNTIME=local`。本番でお客さんがボタンを押すときは **Cloud**（§6.10）。Private でも GitHub 連携があれば Cloud は使える（公開必須ではない）。
- Cloud 用リポジトリ URL の正: `https://github.com/nishimura-yuya-git/dentacle`（`CURSOR_CLOUD_REPO_URL`）。`CURSOR_*` と Supabase 特権キーはフロント（`VITE_`）に出さない。
- ベースモデル ID の既定は `grok-4.5`（§6.14 / §6.53）。実 ID は `Cursor.models.list()` で確認してから固定する。
- 手動切替の許容 ID は §6.53（`grok-4.5` / `grok-4.6` / `composer-2.5`）。環境変数 `CURSOR_MODEL_ID` はフォールバック。
- **`GET /api/cursor/health`**: `Authorization: Bearer <CURSOR_HEALTH_SECRET>` 必須。未設定時は常に 401。公開 JSON は `ok` / `service` / `ready` のみ。設定エラー詳細はサーバーログのみ（クライアントに `err.message` を返さない）。
- CLI 用の詳細（`describeCursorEnv`）と HTTP 公開 DTO（`healthGate.ts`）は分離する。`localCwd` / `hasApiKey` / `modelId` / 環境変数名入り note を無認証ヘルスで返さない（§10.10）。
- **本番（Vercel）**: `CURSOR_HEALTH_SECRET` を Environment Variables にローカルと同名で設定する（`VITE_` は付けない）。値自体は MEMORY / Git に書かない。あわせて `CURSOR_API_KEY` 等のサーバー専用 `CURSOR_*` も本番へ入れる。
- **デプロイ／本番公開作業時**: AI は上記 Vercel 設定の有無を必ず確認し、未設定なら手順を案内する（ユーザー明示のリマインド義務）。
- 関連: `server/cursor/`, `server/cursor/healthGate.ts`, `api/cursor/health.ts`, `.env.example`, Vercel, §6.10, §6.12, §6.14, §6.34, §7, §10.10

### 6.37 自動提案の決定論精度ゲート（2026-08-11 決定 / 同日追記）

- Cursor SDK の構造化結果は **apply 前**に決定論バリデーションする（`validateProposeResult`）。LLM-as-judge は使わない。
- **hard（スロット除外）**: 稼働帯外、所要時間不一致、同一号車の時間重複。
- **warn（記録のみ・初版は採用継続）**: 移動ギャップ不足、希望曜日外、**距離ジャンプ（`travel_jump`。行列上の連続移動が目安 45 分超）**。
- **停止（DB に書かない）**: 採用可能スロット 0、または hard 棄却率 > 70%。
- 結果は `schedule_jobs.result_snapshot.accuracy` に保存する（運営画面への精度モニタ表示はしない。§6.38）。
- 関連: `server/schedule/validateProposeResult.ts`, `runProposeJob.ts`, `pnpm run schedule:test-accuracy`, §6.11, §6.13, §6.34, §6.39

### 6.38 運営向け AI 利用状況（2026-08-11 決定 / 同日改定）

- **入口**: `/proposals?view=usage`（運営ハブ内。§6.46）。旧 `/admin/ai-usage` は同URLへリダイレクト。サイドバーに「AI利用状況」単独項目は置かない。
- **表示の基準はリクエスト別の消費**（`schedule_jobs`）。行には実行日時・クリニック・対象日・モデル・時間・トークン・課金を出す。
- **出さない**: 割付精度モニタ、表の件数列・精度列、モデル別の参照料金表（仮単価テーブル）。精度ゲート本体と `result_snapshot.accuracy` 保存は維持（§6.37）。
- **料金表示は円**: `USD_TO_JPY = 160`（`aiModelPricing.ts`）。確定課金と参照概算を円換算。実請求の正は Cursor 課金。
- **絞り込み**: 「AI利用状況」見出し右端（`actions`）にクリニック・開始日・終了日を**横1行**で置く（`DatePicker inline`・`flex-nowrap`。§10.12）。既定は直近30日。
- **合計**: 同行の `/icon/coin.png` アイコン → 連絡者リストと同型の近傍ポップオーバー（`useAnchoredPopover`）。中身は**料金合計のみ**（確定＋参照概算の合算円）。
- **モデル切替（2026-08-13）**: 全院共通。許容・既定は §6.53。自動カスケードではない。
- 関連: `ProposalsPage.tsx`, `useAiUsageDashboard.tsx`, `AiUsageFilters.tsx`, `AiUsageTotals.tsx`, `AiUsageModelSwitcher.tsx`, `public/icon/coin.png`, §6.14, §6.29, §6.36, §6.37, §6.46, §6.53, §10.12

### 6.39 自動提案スナップショット（住所必須・距離・頻度）（2026-08-11 決定）

- カレンダー自動提案の入力スナップショットは **schemaVersion: 2**（`server/schedule/types.ts`）。
- **住所必須**: `patients.address` が空の患者は割付対象外。除外件数は `excludedWithoutAddress` として監視。住所なしのみで候補 0 ならエラー。
- **距離**: `travelDistance.ts` で `travelMinutesMatrix` を生成して渡す。生住所は載せない（§6.12 / §6.16）。
- **頻度・期限**: `visitDueUrgency.ts` が `dueStatus` / `dueUrgencyDays` の SSoT。候補は overdue → due_soon 優先で並べ、プロンプトでも優先指示する。
- プロンプトは距離最小化と期限優先を明示する（`buildProposePrompt`）。エリア/施設連続は併用。
- **号車割付の文言**は §6.8 / §6.48 に合わせる（並行ルート＋号車内密詰め）。「同時刻横並び禁止」「1号車シリアル詰め」は書かない。
- 関連: `buildProposeSnapshot.ts`, `buildProposePrompt.ts`, `travelDistance.ts`, `visitDueUrgency.ts`, §3, §6.8, §6.16, §6.34, §6.37, §6.48

### 6.40 セキュリティ是正: clinic_members RLS / propose 制限 / 公開エラー（2026-08-11 決定）

セキュリティ監査（2026-08-11）で判明した Medium 指摘への恒久方針。

- **`clinic_members` RLS**: 広すぎる `FOR ALL`（`clinic_members_write_admin`）を廃止し INSERT / UPDATE / DELETE に分割する。
  - UPDATE/DELETE: 既存 `role = 'owner'` 行は変更不可。WITH CHECK でも `role <> 'owner'`（owner 昇格禁止）。
  - INSERT（admin）: `role <> 'owner'` かつ `not is_platform_admin_user(user_id)`。
  - bootstrap owner: `not is_platform_admin()` を必須（運営は `clinic_members` に載せない・§6.29）。
  - helper: `is_platform_admin_user(uuid)`（SECURITY DEFINER）。`platform_admins` を RLS 下で直接 EXISTS すると一般 admin から見えず判定が空振りするため。
- **招待 RPC**: `add_clinic_member_by_email` の `p_role` は `admin/coordinator/call/doctor/dh` のみ。`owner` は不可。
- **自動提案レート制限**: クリニック単位で同時実行1本 + クールダウン `PROPOSE_COOLDOWN_MS=60_000`（`proposeRateLimit.ts`）。超過時は HTTP 429 + `Retry-After`。サーバーレス複数インスタンスではベストエフォート。
- **レート制限のユーザー文言**: 「しばらくしてから」ではなく、`retryAfterSec` と reason（処理中 / 連続実行）で「1分後までお待ちください」等を明示する（`toRateLimitedProposeError`）。空き枠埋めも同型キー（`clinicId:gap-fill`）で制限してよい。
- **公開エラー**: クライアント向けは `toPublicProposeError` の固定日本語のみ。Postgres / SDK の生 `error.message` を JSON に載せない。詳細はサーバーログのみ（§10.11）。
- 関連: `supabase/migrations/20260811160000_clinic_members_rls_hardening.sql`, `server/schedule/proposeRateLimit.ts`, `publicErrors.ts`, `runProposeJob.ts`, `api/schedule/propose.ts`, §6.25, §6.29, §6.34, §7

### 6.41 カレンダー操作UIの補足（2026-08-09 決定 / 2026-08-11 改定）

- 空枠クリック／縦ドラッグは、権限がある場合 **空き枠埋めパネル**（§6.47）を開く（時刻・号車を seed）。手動登録はパネル内「手動で登録」。権限不足時は従来どおり登録モーダル。既存訪問ブロック上では空枠ドラッグを開始しない（`gridTimeDrag.ts`）。
- 表示日が今日かつ 9:00〜18:00 の場合、グリッド全体を横断する現在時刻線を約30秒ごとに更新する（`nowLine.ts`）。
- 連絡者=`/icon/telephone.png`、キャンセル=`/icon/block-user.png`、日別メモ=`/icon/note.png`。白枠ボタンと日本語ツールチップを使う。ツールチップは absolute ではなく **body portal + fixed + z-[100]**（見出し帯の `overflow-x-auto` でクリップされない。§10.25）。
- 連絡者・キャンセル・日別メモは `useAnchoredPopover` によるアイコン近傍のポップオーバーとし、ESC・外側クリックで閉じる。連絡者とキャンセルは当日一覧表示を主とし、カレンダー上で電話確認の OK / NG 操作は行わない。
- アイコンは電話→キャンセル→日別メモの順に並べる。日別メモは内容がある場合に緑ドットを表示し、`clinic_day_memos` へ保存する。
- ヘッダーアイコンと重複する `CalendarOpsPanel` は置かない。取消件数はキャンセルアイコンのバッジ用に維持する。
- 表示列は初期列数・クリニック単位の保存値・予定がある最大号車から自動決定し、予定がある号車を隠さない（`visibleVehicleColumns.ts`）。

### 6.42 導入タイプ・患者CSV取込（2026-08-09 決定）

- 導入タイプは設定画面で `clinics.metadata.introduction_lane`（`startup` / `existing`）へクリニック単位に保存する。自動提案画面・カレンダーAIは保存済み値を参照し、画面内で選択させない。UIは §6.51（Select＋詳細1面）。
- レーンプリセットの SSoT は `proposalLanePresets.ts`。立ち上げは最大10件・13時まで、既存は最大36件・18時まで。
- `doc/患者データ.csv` はレセコン系の個人別全集計であり、Apotool出力として扱わない。`/import` は全件取込、UTF-8 / Shift_JIS、令和年を含む期間行からの年推定に対応する。
- 患者漢字氏名の先頭「・」は正規化時に除去するが、欠けた漢字を推測復元しない。
- CSV選択後の進捗と結果は `ImportProgressModal` に表示し、取込実行中は閉じられないようにする。ページ内に重複する進捗セクションを置かない。

### 6.43 共通画面・入力・通知（2026-08-09 決定 / 2026-08-11 追記）

- アカウントメニューに「CSV取込」（`/import`）を置き、業務ナビには置かない。
- ホーム画面は設けず、`/` とログイン後の起点は `/calendar` とする。
- `DashboardLayout` のキャンバス背景は `#FAFAFA`。
- 日付入力は共通 `DatePicker`（portal 月カレンダー・緑選択）を使い、見た目用のネイティブ `type="date"` を新規追加しない。
- **時刻入力（2026-08-11）**: 共通 `TimePicker`（時・分2列スクロール・portal・緑選択・既定5分刻み）を使う。見た目用のネイティブ `type="time"` を新規追加しない（ブラウザ青系UI禁止）。
- 近傍ポップオーバー（`useAnchoredPopover`）内で Select / TimePicker / DatePicker を使う場合、メニュー portal には `data-anchored-ignore-outside="true"` を付け、外側クリック判定から除外する（§10.18）。
- 成功・失敗の短い通知は右上固定トーストで約3.5秒表示する。入力欄近傍のバリデーションは画面内に残す。
- 設定画面のレイアウトは §6.51（見出し Select でセクション切替・表形式マスタ）。
- 関連: `DatePicker.tsx`, `TimePicker.tsx`, `Select.tsx`, `useAnchoredPopover.ts`, §6.26, §6.51

### 6.44 患者一覧・電話確認一覧UI（2026-08-09 決定）

- 患者一覧はチェック列、氏名アバター、来院回数（`metadata.visit_count`）、前回訪問日（`patient_visit_conditions.last_visit_date`）、次回、主担当（`staff_members`）を中心とする高密度表。未実装項目は「—」。
- 見出し下に全患者数と今月新規患者数（`created_at`・Asia/Tokyo）のサマリー帯を置き、検索で全患者数を変えない。
- 電話確認一覧（`/contacts`）は患者一覧と同型の検索・サマリー・表を使い、列だけ電話確認向けにする。既存の OK / NG 業務ロジックは維持する。

### 6.45 運営向け自動提案画面UI（2026-08-09 決定 / 2026-08-11 改定）

- `/proposals` は §6.34 のとおり運営専用（§6.46）。
- **`fillViewport`** で画面縦幅いっぱいにし、表は内部スクロール＋ sticky 見出し（操作ログ／設定と同型）。
- 提案内は見出し右の Select「表示」で **条件設定 / 最近のジョブ / 提案内容** を1画面ずつ出す（縦積みの3ブロックにしない）。
- **条件設定**: 生成に効くのは対象日・チームのみ。訪問条件・優先ルール等の未接続UIは「準備中」折りたたみ。ステッパーは条件設定内のコンパクト表示。
- **最近のジョブ**: 全院から直近100件を取得し、クリニック Select で絞り込み（デフォルト「すべてのクリニック」。全院時のみクリニック列）。再利用・採用は **ジョブ所属の `clinic_id`** を使う（ヘッダーの active clinic で別院を汚さない）。
- ユーザー向け文言に「Day0」のラベル・バッジを出さない。内部関数名・開発用語としての利用は可。
- サイドバーの選択状態は背景・文字・アイコン色で表し、左端の緑縦バーは使わない。
- 関連: `ProposalsPage.tsx`, `GenerateProposalSection.tsx`, `RecentJobsSection.tsx`, `ProposalItemsSection.tsx`, `filterRecentJobs.ts`, §6.34, §6.38, §6.46

### 6.46 運営AIハブ（自動提案 / AI利用状況の切替）（2026-08-11 決定 / 同日改定）

- 運営向けの自動提案と AI利用状況は**1ページに統合**する（`ProposalsPage`）。
- 切替UIはコンテンツ内の丸ピル（旧 `PlatformAiViewSelect`）ではなく、**見出し右の共通 Select「画面」**（自動提案 / AI利用状況）。設定画面のセクション Select と同型。
- URL: `/proposals`（自動提案）／`/proposals?view=usage`（AI利用状況）。旧 `/admin/ai-usage` はリダイレクト。
- サイドバーは「自動提案」1項目のみ（`matchPrefixes` に `/admin/ai-usage` を含め、旧直リンクでも選択中表示）。
- 関連: `ProposalsPage.tsx`, `navConfig.ts`, `AiUsagePage.tsx`, §6.33, §6.38, §6.45

### 6.47 空き枠埋め（gap_fill・副導線）（2026-08-11 決定 / 同日改定）

- **主導線は全日の自動提案のまま**（§6.5 / §6.34）。空き枠を1件ずつ探すUIを主ボタンにしない。
- **副導線「空きを埋める」**: カレンダー右上で自動提案の隣。空セル選択／ドラッグ、自動提案空振りトーストからも同じパネルへ誘導してよい。
- **UX**: 近傍ポップオーバー内の短い対話（例:「9:30〜10:30でいけそうな人いる？」）→ 候補一覧 →「仮予約にする」で1件採用。手動登録への逃げ道を残す。
- **API**: `POST /api/schedule/gap-fill` → `runGapFillJob`。**DB への仮予約一括書き込みはしない**。採用はクライアントの `createTentativeAutoProposal`（`source: auto_proposal` / `tentative`）。
- **候補の並び（近接最優先）**: 空き枠前後の既存訪問をアンカーにし、`travelDistance.ts` の移動分（`gapProximityMinutes`）が小さい順を正とする。期限（`dueStatus`）は二次。生住所は渡さない（§6.12 / §6.16 / §6.39）。
- **住所必須（認識違い防止）**: 候補0の主因として依頼文不足より **`patients.address` 未登録** を疑う。住所0件だと近接候補も出せない。空エラーは住所未登録を明示する。
- **決定論フォールバック**: 近接ランキングはアプリ側 SSoT（`rankGapFillByProximity.ts`）。Cursor SDK は理由文の補強に使い、エージェント空振り・パース失敗時も近接候補を返す（空配列で止めない）。
- **スナップショット**: 候補上限を広め（例: 60）、窓内最大候補数は少数（例: 5）。当日既存枠を `existingVisits` / `anchorPatientIds` で渡し、行列にアンカーを含める。
- **条件外**: 期限が遠い・希望曜日不一致・移動がやや長い等でも近い候補は `warnings` 付きで返す。本当に無理な人だけ除外（当日既枠・住所なし・窓に所要が載らない等）。
- **レート制限UI**: API の `retryAfterSec` を受け取り、メッセージの待機秒は固定表示せず**クライアントで毎秒減らす**。解除まで「候補を探す」を無効化する（§6.40 のキーと同型）。
- 関連: `GapFillPanel.tsx`, `runCalendarGapFill.ts`, `calendarGapFillError.ts`, `api/schedule/gap-fill.ts`, `runGapFillJob.ts`, `rankGapFillByProximity.ts`, `buildGapFillSnapshot.ts`, `buildGapFillPrompt.ts`, `createTentativeAutoProposal`, §6.5, §6.11, §6.34, §6.39, §6.40

### 6.48 割付ナレッジの正本（ゴールデン日・並行ルート）（2026-08-11 決定 / 同日・3〜8月検証で確定）

> 自動提案の「良さ」を測るベース。百科事典Wikiではなく、構造化シグナルと評価指標にする（§6.13）。  
> 根拠: [Apotool 診療カレンダー](https://apo-toolboxes.stransa.co.jp/calendar/) の **2026-03-01〜08-31（月〜土）** 日次HTMLを集計（稼働日152日）。要約は `tmp/apotool-calendar-mar-aug-2026-summary.json`（gitignore・個人情報なし）。

#### 3〜8月で確認できた構造（個人名・住所は書かない）

| 指標 | 結果 | 解釈 |
|---|---|---|
| 朝（〜9:30）に2台以上並行 | **97.4%** | 並行ルートが常態 |
| 朝に3台以上並行 | **88.2%** | 3本以上が標準帯 |
| 9:00ちょうどに2台以上スタート | **82.9%** | 同時刻横並びは正常 |
| 稼働号車3台以上 | **92.1%** | 必要台数を並行投入 |
| 1号車シリアル詰めっぽい日 | **7.9%** | 例外であり正ではない |
| 稼働日あたり平均稼働号車 | **約4.2台** | 需要で 2〜7 に変動 |
| 号車内 median 所要 / ギャップ | **約21分 / 約18分** | 密連続（30分＋35分格子ではない） |

月別も同型（3〜7月は平均稼働号車 約4.2・朝並行 約4。8月は夏季休暇等でやや薄いが、構造は同じ）。

#### ゴールデン日

- **2026-08-10** はスポット確認用。同日は稼働3号車・9:00同時3台スタート・4号車以降空で、上記分布と矛盾しない。
- 例外枠（初診・医師同行・取消・休暇ブロック）は通常枠と別扱い。

#### Dentacle 案との差分

- Dentacle 仮案は固定30分＋一律ギャップの**薄い格子**になりやすく、号車内密度が実枠に届かない
- 「7台へ薄く横展開」も「1台へシリアル詰め」も、実運用の正ではない

#### 実装・評価への含意

- アプリ側正規化（`packProposeSlots`）は **teamIndex（並行ルート）を維持**し、**号車内だけ**所要＋実移動ギャップで密連続する（2026-08-11 実装）。1号車シリアル詰めはしない
- プロンプト（`buildProposePrompt`）も同方針（エリア束→必要台数並行→号車内密配置→平準化）
- 評価は「緑の仮枠が並んだか」ではなく、次を見る:
  1. 並行号車数（需要に見合う本数／空き号車の許容）
  2. 号車内密度（件数・ギャップが実移動に近いこと）
  3. エリア／施設束（近接クラスタが号車に載っていること）
- プロンプト・pack・validate の方針が矛盾したら **本節と §6.8 を正**とする
- 関連: §6.8, §6.13, §6.16, §6.34, §6.37, §6.39, §10.19, `buildProposePrompt.ts`, `packProposeSlots.ts`, `runProposeJob.ts`

### 6.49 患者住所ジオコード（距離根拠）（2026-08-11 決定）

- 生住所を SDK / プロンプトの判断材料にしない（§6.12 / §6.16 / §6.39）。距離の根拠は `patients.latitude` / `longitude` → `travelMinutesMatrix`。
- **座標付与**: 国土地理院の住所検索等で `patients.address` をジオコードし座標を埋める（`scripts/geocode-patient-addresses.mjs`）。登録時の自動付与は必須ではない。
- **運用**: 新規患者・住所変更後、および `latitude IS NULL` の行に対し同スクリプトを再実行する。
- **外れ値**: 誤ヒットで東京圏外など明らかに圏外の座標が入った場合は **座標を NULL に戻し**、既定移動分フォールバック（例: 35分）に任せる。誤座標のまま距離行列を歪めない（§10.23）。
- 関連: `scripts/geocode-patient-addresses.mjs`, `scripts/scrape-apotool-addresses.mjs`, `buildProposeSnapshot.ts`, `travelDistance.ts`, §6.20, §6.39

### 6.50 操作ログUI（`/operations`）（2026-08-11 決定）

- 簡易監査UIのまま、患者一覧と同系の**表形式**（操作日時 / 操作 / 対象 / 詳細）。英語の action キーをそのまま出さない。`clear` / `confirm` / `gap_fill` 等も日本語ラベル化する（`formatOperationTrace.ts`）。
- **`fillViewport`**: 表は内部スクロール。見出し右に操作・対象の Select（「すべて」可）。取得は RLS 範囲で直近100件、クライアント絞り込み。
- **クリニック**: 運営または複数院ではクリニック Select（「すべてのクリニック」可）。すべて選択時のみ表にクリニック列を出す（AI利用状況と同型）。
- **ページネーション**: 絞り込み後を右下で件数切替（10/20/50・既定20）＋前後ページ。フィルタ／件数変更時は1ページ目へ戻す。
- 本格帳票・高度な監査UIは後段のまま（§6.19）。
- 関連: `OperationsTracesPage.tsx`, `OperationsTracesTable.tsx`, `OperationsTracesPagination.tsx`, `formatOperationTrace.ts`, §6.19, §6.29, §6.32

### 6.51 設定画面UI（セクション切替・表形式マスタ）（2026-08-11 決定）

- 見出し右の Select「表示」で **導入タイプ / チーム / 担当 / 稼働枠** を1セクションずつ出す。長い説明文「導入タイプ・チーム・担当・稼働枠」は置かない。
- **導入タイプ**: 2枚カード横並びではなく、Select ＋選択中の説明・最大件数・稼働帯の詳細1面（`IntroductionLaneSection`）。保存先・プリセット SSoT（`proposalLanePresets`）は変えない（§6.42）。
- **チーム・担当・稼働枠**: 操作ログと同系の `rounded-[28px]` パネル＋見出し付き表＋下固定の追加フォーム（`SettingsMasterPanel`）。稼働枠はチーム／曜日／時間列。
- **sticky 見出し**: 表は `border-separate` ＋ `thead sticky`（`border-collapse` だと sticky が効かないことがある。§10.24）。
- 削除・編集UIは本節のスコープ外（未実装のまま）。
- 関連: `SettingsPage.tsx`, `SettingsMasterPanel.tsx`, `IntroductionLaneSection.tsx`, §6.26, §6.42, §6.43

### 6.52 プラットフォーム保安（シード表削除・漏洩PW・DB SSL）（2026-08-12 決定）

セキュリティ監査 TODO の優先3件（S-01 / S-02 / S-07）への恒久方針。

- **S-01**: シード用一時表 `public._seed_sql_chunks` はアプリ未参照・RLS無効のため **DROP**（`20260812140000_drop_seed_sql_chunks.sql`）。再シードが必要なら service_role のみの一時表として作り直す。型定義からも削除する。
- **S-02**: Auth の **漏洩パスワード保護**（HaveIBeenPwned / `password_hibp_enabled`）を **ON** にする。運営がアカウントを作る運用でも有効。Dashboard「Auth → Email」または Management API `PATCH .../config/auth`。
- **S-07**: 外部DB接続の **SSL Enforcement を ON**（`supabase ssl-enforcement update --enable-db-ssl-enforcement --experimental`）。
- **S-09（未完）**: PITR は Pro 以上の有料アドオンで、現状コンピュートが Micro のため **Small 以上への変更が前提**。課金承認後に `pitr_7` 等を有効化する（勝手に課金変更しない）。
- 関連: Advisors、§6.40、§7

### 6.53 運営モデル切替（Grok 4.6・2026-08-13 決定）

自動提案の実行モデルは運営画面で全院共通に切り替える。§6.14 の自動カスケードは未実装のまま。

- **許容 ID**: `grok-4.5` / `grok-4.6` / `composer-2.5`
- **既定・おすすめ**: `grok-4.5`（未切替・行が読めない場合もこれ）
- Composer 2.5 は残す。既定を 4.6 に上げない。4.5 を外さない。
- `grok-4.6` は手動切替の選択肢。カスケード帯（0〜50% 等）にはまだ載せない。
- 選択肢の正: `src/config/aiModelOptions.ts`。DB 制約: `platform_ai_settings.cursor_model_id`
- 環境変数 `CURSOR_MODEL_ID` はフォールバック既定（`grok-4.5`）。runtime の正は運営切替。
- 関連: `AiUsageModelSwitcher.tsx`, `loadPlatformCursorModel.ts`, `aiModelPricing.ts`, §6.14, §6.36, §6.38

---

## 7. 🔐 RLS・権限・セキュリティ

| テーブル・API | 読み取り | 作成 | 更新 | 削除 | 注意点 |
|---|---|---|---|---|---|
| 認証監査（`auth_audit_logs`） | 運営のみ | `log_auth_audit_event` のみ | 原則不可 | 原則不可 | IPは request.headers。クライアント申告禁止。clinic_idは検証付き。membershipsはスナップショット（§6.15） |
| IPブロック（`auth_ip_blocks`） | 運営のみ | `block_auth_ip` | `unblock_auth_ip`（論理無効化） | 原則不可 | 一般ログイン拒否。運営はバイパス。対象は回線出口IP（§6.15） |
| 在席ハートビート（`auth_presence`） | 運営のみ一覧 | `touch_auth_presence`（本人） | 本人 upsert | 本人／logout時 | 直近60秒＝在席。運営一覧は `list_auth_presence`（§6.15） |
| `GET /api/cursor/health` | Bearer=`CURSOR_HEALTH_SECRET` | — | — | — | 未設定は401。公開は ok/service/ready のみ（§6.36 / §10.10） |
| `clinic_members` | 所属メンバー | bootstrap（非運営 owner）/ admin（owner以外・非運営） | admin（owner行以外） | admin（owner行以外・grantなし） | UIロックだけでは不可。§6.40 |
| `POST /api/schedule/propose` | — | 認可済みロール | — | — | JWT必須。60秒クールダウン＋同時1本。公開エラーは固定文言（§6.40） |
| `[table_a]` | `[role]` | `[role]` | `[role]` | `[role]` | `[制約]` |
| `[table_b]` | `[role]` | `[role]` | `[role]` | `[role]` | `[制約]` |

### 必須

- **Supabase をセキュリティ最優先で採用する。** RLS必須。`.cursor/rules/supabase-security-*.mdc` に準拠する。
- **プラットフォーム保安（§6.52）**: `_seed_sql_chunks` を残さない。漏洩パスワード保護 ON。DB SSL Enforcement ON。PITR は課金承認後。
- 管理者・本人・所属組織などの権限境界を明記する
- 既存RLSの削除・弱体化は禁止
- 秘密情報をログ・フロント・コミットに出さない
- `service_role` はサーバーのみ。Cursor Cloud エージェントへ Supabase / DB 直結認証を渡さない（§6.12）
- ログインIP監査はサーバー側取得のみ。クライアント由来IPを正にしない（§6.15）
- 患者・予約・制約・監査の正データは Supabase に置く
- API レスポンスに内部エラーメッセージ（Postgres/SDK 生文言）を載せない（§6.40 / §10.11）
- `clinic_members` のオーナー保護・運営除外は UI だけでなく RLS で強制する（§6.40）

---

## 8. 🧪 テスト方針

### 8.1 期待値の根拠

テスト期待値は、以下のいずれかを根拠にする。

- ユーザー報告
- 実画面
- DB実データ
- 既存仕様書
- 承認済み業務フロー図

AIが自分の実装に合わせて期待値を作ることは禁止。

### 8.2 必須テスト

| 変更種別 | 必須テスト |
|---|---|
| 計算式変更 | 単体テスト + 代表ケース + 端数ケース |
| DB保存変更 | 保存後の実データ確認 + RLS確認 |
| 画面表示変更 | 表示値の根拠確認 |
| バグ修正 | 再現テストを先に追加 |
| 業務フロー変更 | E2Eまたは統合テスト |

### 8.3 テストデータ制約

- テスト専用ユーザー・日付・会場を明記する
- 本番データを破壊しない
- テスト後は作成データをクリーンアップする
- パスワード・認証情報の変更は禁止
- 患者種まきの正本パスは `doc/患者データ.csv`（§6.20）。個人情報を仕様メモへ増やさない
- 開発用ログインは §6.22（メールのみMEMORY可・パスワード禁止・他検証ユーザーは削除）
- CSVのDB書込デモは合成データ優先（§6.20）。実CSVは解析件数の確認に留める

---

## 9. 🖼️ 業務フロー・設計図

| 領域 | 参照ドキュメント | 注意点 |
|---|---|---|
| 訪問スケジュール自動提案 | 要確認（`docs/architecture/` 未整備） | 仮予約→電話確認→本予約の矢印を正とする |
| ルート最適化 | 要確認（`docs/architecture/` 未整備） | 移動・施設まとめ・医師同行制約 |
| Apotool調査（機能骨格） | `doc/Apotool管理ツール調査結果_訪問歯科スケジュール自動化.md`（Obsidian写しあり） | 模倣対象。個人情報なし。完成形ではない。§6.5 / §6.18 |

業務コアを触る場合は、実装前に設計図を確認する。

新しいデータフローを作る場合は、設計図更新提案も出す。

---

## 10. 📜 過去に壊れた事例・再発防止

| 日付 | 事象 | 原因 | 再発防止 |
|---|---|---|---|
| 2026-08-06 | Apotool調査メモの取り扱い | 調査は読み取り専用で個人情報未記録 | 仕様根拠にする際も個人情報を持ち込まない。画面構成・項目名・業務フローのみ参照する |
| 2026-08-06 | 裏処理の二重実装リスク | UI / Edge / 独自 LLM に自動提案が分かれやすい | Cursor SDK 経路を正とし、同等ロジックを別経路で再実装しない（§6.11） |
| 2026-08-08 | security:scan がコメントの禁止文言で落ちる | フロント配下の `service role` 文字列検知 | コメントでも当該文字列を書かない（§10.4）。hook 自動実行はしない（§2.12） |
| 2026-08-09 | ▼アカウントメニューが表示されない | ピル親の `overflow-hidden` が absolute メニューをクリップ | ドロップダウン親に `overflow-hidden` を付けない（§10.6 / §6.24） |
| 2026-08-09 | 患者管理▼が表示されない | ナビ親の `overflow-x-auto` が absolute メニューをクリップ | メニューは portal＋fixed（§10.8 / §6.31） |
| 2026-08-09 | カレンダー日付ナビをグリッド右サイドに誤配置 | 「カレンダーの右隣」を格子本体の右と解釈 | タイトル右隣（`titleAside`）と読む（§6.30 / §10.7） |
| 2026-08-11 | CursorヘルスAPIの無認証情報開示 | CLI用詳細DTOをHTTPに流用し認証なし | Bearer必須＋公開DTO最小化（§6.36 / §10.10） |
| 2026-08-11 | clinic_members の RLS が UI より広い | admin FOR ALL で owner 改変・運営 bootstrap 可 | RLS 分割＋運営除外＋招待 RPC から owner 禁止（§6.40） |
| 2026-08-11 | propose API の内部エラー開示・連打 | 生 message 返却・レート制限なし | 固定文言＋60秒クールダウン（§6.40 / §10.11） |
| 2026-08-11 | 仮枠クリックで移動中プレビューが出る | pointerDown で即 move 開始 | `moved===true` のときだけプレビュー（§6.35 / §10.15） |
| 2026-08-11 | ドラッグ後に枠が一瞬戻る | reload で `setVisits([])` | 楽観パッチ＋silent reload（§6.32 / §10.16） |
| 2026-08-11 | 訪問枠下端の濃い緑を左ボーダーと誤認 | resize handle の常時緑表示 | 常時透明・緑バー廃止（§6.35 / §10.17） |
| 2026-08-11 | 号車変更で空き枠埋めパネルが消える | Select portal を外側クリック扱い | portal を外側判定から除外（§6.43 / §10.18） |
| 2026-08-11 | 「1・2号車に詰める」をシリアル1号車詰めと誤読 | 実枠は並行ルート×号車内密配置 | §6.8 / §6.48 を正とし横並び絶対禁止を採らない（§10.19） |
| 2026-08-11 | 空タイトル見出しで操作が右端に飛ぶ／密着する | actions 右寄せ・titleAside の min-w-0 | titleAside 1行＋min-w-max＋空タイトルは justify-start（§10.20 / §10.21） |
| 2026-08-11 | 自動提案ボタンでアイコンと文言が離れる | Button soft の gap／子並び | アイコン+ラベルを1グループ（§10.22） |
| 2026-08-11 | ジオコード外れ値で距離行列が歪む | GSI誤ヒット座標を残した | 圏外は座標NULLへ戻す（§10.23） |
| 2026-08-11 | 設定マスタ表の見出しがスクロールでずれる | border-collapse と sticky | border-separate + sticky thead（§10.24） |
| 2026-08-11 | カレンダーアイコンのツールチップが下に隠れる | 見出し帯 overflow-x-auto が absolute をクリップ | portal + fixed + z-[100]（§10.25） |
| 2026-08-12 | ログイン監査で地図の下に表が潰れる | fillViewport で地図＋表を同時表示 | 地図/一覧は Select 切替。同時に縦積みしない（§6.15 / §10.27） |
| 2026-08-12 | 九州・沖縄選択で地図が全国並みにズームアウト | 沖縄・鹿児島離島インセットを外接に含めた | 本土のみ zoomSelector＋南余白（§6.15 / §10.28） |

### 記録ルール

- 実害が出た不具合はここに残す
- 「誰が悪いか」ではなく「なぜ起きたか」を書く
- 再発防止はルール・テスト・DB制約のいずれかに落とす

### 10.1 調査資料・個人情報（2026-08-06）

- 事象: Apotool調査は読み取り専用。患者名・電話番号・個別メモ・ログイン情報は記録していない。
- 原因: セキュリティ・コンプライアンス前提での調査方針。
- 再発防止: 過去調査メモを仕様根拠にする場合も個人情報を増やさない。画面構成・機能・項目名・業務フローのみを参照する。
- 関連: Apotool調査メモ、患者カルテ、セキュリティ

### 10.2 Cursor SDK 裏処理の二重実装（2026-08-06）

- 事象: 自動提案・ルート最適化を画面側や別 API にコピーすると結果がズレる。
- 原因: 裏処理の責務境界が曖昧なまま実装が進むと起きやすい。
- 再発防止: AI 寄りの裏処理は Cursor SDK を正とする。UI は起動と結果表示に留め、同等計算を再実装しない。
- 関連: §6.10, §6.11, スケジュール自動提案, ルート最適化

### 10.3 患者CSVを訪問条件の完成データと誤解しない（2026-08-08）

- 事象: `doc/患者データ.csv` はレセコン系の個人別集計であり、ルート最適化に必要な住所・頻度・可能曜日等は含まれない。
- 原因: ファイル名から「患者マスタ完成形」と誤解しやすい。
- 再発防止: CSVは種まきのみ（§6.20）。取込後も制約育成フローを必須導線にする。取込完了＝導入完了と書かない・実装しない。
- 関連: §6.18, §6.20, オンボーディング

### 10.4 フロントコメントの service role 文言で security:scan が落ちる（2026-08-08）

- 事象: `security:scan --working-tree` が `SEC-CLIENT-SERVICE-ROLE`（high）で失敗した。実コードは anon クライアントのみで、禁止説明のコメントが検知された。
- 原因: スキャナがフロント配下の `service role` / `service_role` 文字列を広く拾う。
- 再発防止: `src/` 配下では禁止説明でも当該文字列を書かない（「サーバー専用鍵」「特権キー」等に言い換える）。本物の漏洩は別途禁止のまま。
- 関連: `src/config/env.ts`, `src/lib/supabase.ts`, `scripts/security-scan.mjs`, §2.12

### 10.5 メール確認ONだとE2Eで所属RPCが失敗する（2026-08-09）

- 事象: Auth signUp 直後は session が無く、`create_clinic_with_owner` 等が permission denied になった。
- 原因: Supabase Auth のメール確認が有効で、未確認ユーザーに session が発行されない。
- 再発防止: 開発・デモはメール確認オフを推奨（§6.22）。オンのまま検証する場合は確認済みにしてからログインする。パスワードを MEMORY に書かない。
- 関連: Supabase Auth, §6.22, 所属管理RPC

### 10.6 ピル親の overflow-hidden でアカウントメニューが消える（2026-08-09）

- 事象: クリニック名右の▼を押しても、メニューが何も表示されないように見えた。
- 原因: クリニック名ピル親の `overflow-hidden` が、`absolute` 配置のドロップダウンをクリップしていた。
- 再発防止: 角丸ピルで absolute メニューを出す場合、親に `overflow-hidden` を付けない。開時は z-index でヘッダー内タイトル行より前面に出す。
- 関連: `DashboardLayout.tsx`, `AccountMenu.tsx`, §6.24

### 10.7 「カレンダーの右隣」をグリッド右と誤解する（2026-08-09）

- 事象: 日付ナビ（年月日・前へ／本日／次へ・日付・表示列）を訪問号車グリッドの右サイドパネルに置いてしまった。
- 原因: 「カレンダー部分の右隣」を格子本体の右と解釈した。ユーザー意図はタイトル「カレンダー」の右隣（ヘッダー赤枠位置）だった。
- 再発防止: カレンダー日付ナビは `titleAside` 横並び（§6.30）。配置指示にスクショ注釈がある場合は、タイトル行かコンテンツ行かを先に確認する。
- 関連: `CalendarPage.tsx`, `CalendarDateControls.tsx`, §6.30

### 10.8 ナビ親の overflow-x-auto で▼メニューが消える（2026-08-09）

- 事象: 上部ナビ「患者管理 ▼」を押してもメニューが出ないように見えた。
- 原因: 業務ナビの `overflow-x-auto` が、子の `absolute` メニューをクリップしていた（§10.6 と同系。overflow-hidden 以外でも起きる）。
- 再発防止: ナビ系ドロップダウンのメニューは `createPortal`＋`position: fixed` で出す。親 nav に overflow を安易に付けない。デスクトップ業務ナビは `overflow-visible` を優先。
- 注: 2026-08-10 以降、患者管理の主導線はサイドバー内アコーディオン（§6.31 / §6.33）。`NavDropdown` を再利用する場合でも本項は有効。
- 関連: `NavDropdown.tsx`, `DashboardLayout.tsx`, §6.31, §6.33, §10.6

### 10.9 fillViewport をサイドバー横並びにしたときの高さ崩れ（2026-08-10）

- 事象: ルートをサイドバー＋本文の横並び（flex）にした際、右カラム指定が不足するとカレンダーの高さ計算・横スクロールが壊れる。
- 原因: flex 子は既定で縮まない。`fillViewport` 時に右カラムへ `min-h-0` / `min-w-0` / `overflow-hidden` が無いと `h-dvh` 前提が崩れる。
- 再発防止: `fillViewport` の横並び化では右カラムに `min-h-0 min-w-0 overflow-hidden` を必ず付ける。サイドバー追加・折りたたみ後もカレンダーが画面内に収まることを確認する。
- 関連: `DashboardLayout.tsx`, `CalendarPage.tsx`, §6.33

### 10.10 CursorヘルスAPIの無認証運用メタ開示（2026-08-11）

- 事象: `GET /api/cursor/health` が認証なしで `localCwd` / `hasApiKey` / `modelId` / 環境変数名入り note、および設定不足時の `err.message` を返していた。
- 原因: CLI 用の `describeCursorEnv` を HTTP レスポンスに流用し、開発用ヘルスを無認証のまま公開していた。
- 再発防止: HTTP は `CURSOR_HEALTH_SECRET` Bearer 必須（未設定は 401）。公開 JSON は `ok` / `service` / `ready` のみ。詳細は `describeCursorEnv`（CLI）と `healthGate.ts`（HTTP）を分離し、エラー詳細はサーバーログのみ。ローカルだけ設定して本番（Vercel）を忘れると health は常に 401 になるため、デプロイ／本番公開依頼時は Vercel への `CURSOR_HEALTH_SECRET`（および他のサーバー専用 `CURSOR_*`）設定を必ず案内する。
- 関連: `api/cursor/health.ts`, `server/cursor/healthGate.ts`, `server/cursor/env.ts`, `.env.example`, Vercel, §6.36, §7

### 10.11 API レスポンスへの内部エラーメッセージ返却（2026-08-11）

- 事象: `runProposeJob` / Vite middleware 等が Supabase / Cursor SDK の生 `error.message` を JSON `error` に載せていた。
- 原因: 失敗時のデバッグ文言をクライアントへそのまま返していた。
- 再発防止: クライアント向けは `toPublicProposeError`（固定日本語）のみ。詳細は `console.error` 等のサーバーログに限定する。新 API でも同方針。
- 関連: `server/schedule/publicErrors.ts`, `runProposeJob.ts`, `api/schedule/propose.ts`, `scripts/vite-schedule-propose-middleware.mjs`, §6.40, §7

### 10.12 AI利用状況フィルタの縦積みでヘッダーが膨らむ（2026-08-11）

- 事象: 見出し右のクリニック・開始日・終了日が縦積みになりヘッダー縦幅が膨らんだ。
- 原因: `flex-wrap` と `w-[min(100%,…)]` で各コントロールが親幅いっぱいになり折り返した。
- 再発防止: 見出し右フィルタは `flex-nowrap`・固定幅・`DatePicker inline`。ヘッダー actions に置く条件UIは横1行を維持する（§6.38）。
- 関連: `AiUsageFilters.tsx`, §6.38

### 10.13 リロード時に未所属を誤表示する（2026-08-09）

- 事象: `clinicReady` 前に `clinics=[]` を未所属と判定し、保存済みの `clinicId` まで消していた。
- 原因: 所属取得完了と空配列を区別していなかった。
- 再発防止: `clinicReady` まで未所属UIを出さず、所属確定前に active clinic を消さない。
- 関連: `ClinicProvider.tsx`, `AuthProvider.tsx`, `ClinicAccessPlaceholder.tsx`

### 10.14 カレンダー日付切替でグリッドを消す（2026-08-09）

- 事象: 前へ／次へで loading 中に `DayVisitGrid` をアンマウントし、号車列が消えてちらついた。
- 原因: 初回準備中と日付切替中を同じ loading 分岐で扱っていた。
- 再発防止: 初回 `gridReady` 後は号車列の枠を維持し、中身だけをスケルトン表示する。
- 関連: `CalendarPage.tsx`, `DayVisitGrid.tsx`

### 10.15 仮枠クリック時に移動中プレビューが出る（2026-08-11）

- 事象: 仮予約をクリック確定するだけで「移動中」オーバーレイが出て UI が崩れた。
- 原因: `pointerDown` 時点で move プレビューを開始していた。
- 再発防止: 実際にポインタが動いた（`moved === true`）ときだけ移動プレビューを出す。移動なしクリックは本予約確定を維持（§6.35）。
- 関連: `DayVisitGrid.tsx`, §6.35

### 10.16 カレンダー移動後の reload で visits を空にする（2026-08-11）

- 事象: ドラッグ移動直後、枠が一瞬元位置に戻って見えた。
- 原因: `load()` が先に `setVisits([])` しており、再取得完了まで空になる。
- 再発防止: 移動・リサイズ・クリック確定では楽観パッチし、再取得は `load({ silent: true })`。クリック確定後は全件 reload を必須にしない（§6.32 / §6.35）。
- 関連: `useCalendarDayData.ts`, `persistMoveVisit`, `confirmTentativeVisit`

### 10.17 訪問ブロック下端の緑を左アクセントと誤認する（2026-08-11）

- 事象: ユーザー指摘の「濃い緑」が左ボーダーではなく下端の resize handle（緑）だった。
- 原因: 常時表示の緑ハンドルと左アクセントを混同しやすい。
- 再発防止: 左の濃い緑 `borderLeft` は置かない。下端ハンドルは常時透明にし、目立つ緑バーを復活させない（§6.35）。
- 関連: `DayVisitColumnBody.tsx`, `visitBlockAppearance.ts`

### 10.18 近傍ポップオーバー内の Select portal で親が閉じる（2026-08-11）

- 事象: 「空きを埋める」で号車 Select を変えると親パネルごと消えた。
- 原因: Select メニューが `body` portal のため、`useAnchoredPopover` の外側クリック判定に入った。
- 再発防止: 外側判定はパネル／ボタンに加え `role="listbox"` と `data-anchored-ignore-outside="true"` を除外する。新規 portal UI には同属性を付ける。Select 展開中の Escape は親を閉じない（§6.43）。
- 関連: `useAnchoredPopover.ts`, `Select.tsx`, `TimePicker.tsx`, `DatePickerPanel.tsx`, `GapFillPanel.tsx`

### 10.19 「詰める」を1号車シリアル詰めと誤読する（2026-08-11）

- 事象: 「1号車や2号車にちゃんと詰める」を受け、同時刻横並び禁止＋1号車→2号車のシリアル縦詰め（`packProposeSlots` / プロンプト）を入れた。一方 8/10 Apotool 実枠は1〜3号車並行スタートで各号車が密。3〜8月集計でも朝並行が常態。
- 原因: 「詰める」を号車数の最小化と読み、実運用の**並行ルート×号車内密度**を見落とした。
- 再発防止:
  - 「詰める」＝各号車ルートの密連続。並行スタートは正常形（§6.8 / §6.48）
  - ゴールデン日／月次差分で方針を検証してから pack / prompt を変える
  - 矛盾時は §6.8 / §6.48 を正とし、シリアル1号車詰めを復活させない
- **是正（2026-08-11）**: `packProposeSlots` を号車内密詰めへ改修。`buildProposePrompt` のシリアル／横並び禁止文言を削除。
- 関連: `packProposeSlots.ts`, `buildProposePrompt.ts`, `runProposeJob.ts`, §6.8, §6.34, §6.48

### 10.20 空タイトル見出しで actions を右端へ飛ばす（2026-08-11）

- 事象: カレンダーは title 空＋`titleAside`＋`actions`。`justify-between` / `flex-1` だと日別メモと「提案をクリア」の間が空きすぎ、自動提案が画面外へ寄る。
- 原因: タイトルありページ向けの右端配置を、空タイトルのツールバーにも適用していた。
- 再発防止: 空タイトル時は `justify-start` + gap でツールバーを連続配置。タイトルありページだけ右端配置。カレンダー操作は `titleAside` 1本にまとめる（§6.34）。
- 関連: `DashboardLayout.tsx`, `CalendarPage.tsx`, §6.34

### 10.21 見出し帯 titleAside を min-w-0 で潰す（2026-08-11）

- 事象: 左群を `min-w-0 flex-1` にすると狭い幅で内容が右操作群へはみ出し、gap/ml の余白が視覚上消える（日別メモと「提案をクリア」が密着）。
- 原因: flex 子の縮小でオーバーフロー描画が隣へ重なる。
- 再発防止: 見出し帯の左群は `min-w-max`。親は `overflow-x-auto`。見出し帯全体は `flex-nowrap`（§6.34）。
- 関連: `DashboardLayout.tsx`, `CalendarPage.tsx`, §6.34

### 10.22 自動提案ボタンでアイコンと文言が離れる（2026-08-11）

- 事象: 自動提案ピル内でアイコン左・文言右に分かれ、中央が空きすぎた。
- 原因: 共通 `Button soft` のサイズ/gap と子要素並びが、コンパクトピル向きでない。
- 再発防止: アイコン+ラベルは `inline-flex` の1グループにまとめる。「空きを埋める」と同系のコンパクトピルにする。
- 関連: `CalendarPage.tsx`, `Button.tsx`, `GapFillPanel.tsx`, §6.34

### 10.23 ジオコード外れ値を座標として残す（2026-08-11）

- 事象: GSI住所検索の誤ヒットで東京圏外座標が入った。距離行列が歪む。
- 原因: 検索ヒットを検証なしで `latitude` / `longitude` に保存した。
- 再発防止: 圏外判定で座標を NULL へ戻し、既定移動分フォールバックに任せる。誤座標を残さない（§6.49）。
- 関連: `scripts/geocode-patient-addresses.mjs`, §6.49

### 10.24 設定マスタ表で sticky 見出しが効かない（2026-08-11）

- 事象: スクロールで氏名/種別などの表見出しがずれた。
- 原因: `border-collapse` だと sticky が効かないことがある。
- 再発防止: `SettingsTable` は `border-separate` + `thead sticky top-0`（§6.51）。
- 関連: `SettingsMasterPanel.tsx`, §6.51

### 10.25 見出し帯アイコンのツールチップが下に隠れる（2026-08-11）

- 事象: 電話／キャンセル／日別メモ等のホバーツールチップが、ヘッダー下や白面の下に入り一部だけ見える。
- 原因: `DashboardLayout` 見出し帯の `overflow-x-auto` が、ボタン内 `absolute` ツールチップをクリップする（§10.8 と同型）。z-index を上げるだけでは足りない。
- 再発防止: `IconHoverTooltip` は `createPortal`＋`position: fixed`＋`z-[100]`（`useFixedHoverTip`）。見出し帯内の absolute ツールチップを復活させない。
- 関連: `IconHoverTooltip.tsx`, `CalendarDayMemo.tsx`, `DashboardLayout.tsx`, §6.41, §10.8

### 10.26 MFA中にメール・パスワード画面がフラッシュする（2026-08-12）

- 事象: 運営 TOTP の6桁確認直後など、認証通過直前にログイン（メール／パスワード）画面が一瞬映る。
- 原因: `mfaGateLoading` 中に MFA UI 表示条件が外れ、未ログイン用フォームへフォールバックしていた。
- 再発防止: `user` があるあいだは `challenge` / `enroll` パネルを維持する。ゲート解決中は待ち表示。メール・パスワード画面は **未ログイン時のみ**（§6.21 / §6.29）。
- 関連: `LoginPage.tsx`, `AuthProvider.tsx`, MFAログイン

### 10.27 ログイン監査で地図の下に表が潰れる（2026-08-12）

- 事象: `fillViewport` で日本地図と認証イベント表を同時表示すると、地図が大きく表が潰れた／見えなくなった。
- 原因: 縦方向に地図＋表を同居させ、地図側の高さ占有が大きかった。
- 再発防止: 「推定ログイン位置」と「認証イベント一覧」は **Select 切替**（同時表示しない）。都道府県選択で一覧へ自動切替。地図は非表示時もマウント維持（§6.15）。
- 関連: `AuthAuditPage.tsx`, `AuthAuditJapanMap.tsx`

### 10.28 九州・沖縄ズームが全国並みにズームアウトする（2026-08-12）

- 事象: 「九州・沖縄」チップを選ぶと地図が極端にズームアウトし、九州に寄らない。
- 原因: Geolonia `map-full.svg` は沖縄・鹿児島離島を地図内インセットで描く。これらを外接に含めると全国に近い viewBox になる。
- 再発防止: 九州のズームは `zoomSelector` で本土県のみ（沖縄・鹿児島除外）。南方向に余白を足して鹿児島本土が切れにくくする。塗り分け用 selector とズーム用を分ける（§6.15）。
- 関連: `japanMapZoom.ts`, `AuthAuditJapanMap.tsx`

---

## 11. 🔗 重要ドキュメント・参照先

- `.cursor/rules/safety.mdc` — 破壊防止ルール
- `.cursor/rules/understanding-first.mdc` — 理解フェーズ
- `.cursor/rules/change-contract.mdc` — 変更契約
- `.cursor/rules/database.mdc` — 計算系DB設計
- `.cursor/rules/architecture-extension.mdc` — SSoT / Adapter Layer
- `docs/agent-loop-harness.md` — Agent Loop / Hard Boundary ハーネス設計
- `loops/goals/bug-fix.md` — Bug Fix 完成ゲート（差し戻し / maxIterations / 完成宣言）
- `loops/graphs/bug-fix.mmd` — Bug Fix 外側 Graph
- `loops/goals/ui-polish.md` / `loops/graphs/ui-polish.mmd` — UI Polish 完成ゲート（Interface Review・§2.11 / 観察証拠・§2.14）
- `.cursor/skills/better-interface/SKILL.md` / `.cursor/commands/better-interface.md` — 横断 Interface Review 司令塔
- `.cursor/skills/better-ui/SKILL.md` — UI polish 細部レシピ（既存トークン準拠）
- `.cursor/skills/playwright-mcp-testing/SKILL.md` — ブラウザ確認と Observe Loop（§2.14）
- `loops/goals/regression-guard.md` / `loops/graphs/regression-guard.mmd` — Regression Guard 完成ゲート
- `scripts/lib/loop-progress.mjs` — No progress ブレーキ
- `scripts/lib/context-budget.mjs` — Context Budget（must / compress / drop）
- `scripts/lib/claim-grounding.mjs` — Claim Grounding（主張↔根拠。UI Polish は観察証拠必須・§2.14）
- `scripts/lib/working-graph.mjs` / `scripts/working-graph.mjs` — Working Graph（薄い共有メモリ）
- `scripts/cursor-safety-guard.mjs` — PreToolUse ガード（変更契約 + Hard Boundary）
- `scripts/change-contract-gate.mjs` — 変更契約ゲート CLI
- `.cursor/subagent-policy.json` — サブエージェント権限定義
- `scripts/cursor-subagent-guard.mjs` — subagentStart ガード
- `scripts/memory-candidates.mjs` — PROJECT_MEMORY 追記候補 CLI
- `scripts/memory-audit.mjs` — PROJECT_MEMORY 要詰め監査 CLI（Memory Tighten）
- `.cursor/commands/project-memory-audit.md` — 要詰め監査コマンド
- `scripts/isolate.mjs` — 危険差分の worktree / shadow 隔離 CLI
- `scripts/security-scan.mjs` / `pnpm run security:hook` — GPT非依存セキュリティ差分スキャン（手動。§2.12）
- `.github/workflows/security-harness.yml` — PR 差分セキュリティ CI（APIキー不要）
- `loops/evals/` / `scripts/lib/eval-template.mjs` — Eval template（§2.13）
- `scripts/lib/failure-taxonomy.mjs` — Failure taxonomy（§2.13）
- `loops/simulations/` / `pnpm run test:harness-simulation` — ハーネス敵対シミュレーション（§2.13）
- `[docs/architecture/README.md]` — 業務フロー図（訪問歯科フローは未整備・要確認）
- `[docs/specs/**]` — 仕様書
- `[tests/invariants/**]` — 不変条件テスト
- `doc/Apotool管理ツール調査結果_訪問歯科スケジュール自動化.md` — Apotool調査（2026-06-14）。機能骨格の正本。模倣対象・個人情報なし（§6.5 / §6.18）
- Obsidian写し: `提案書・案/株式会社Cスリー/Apotool管理ツール調査結果_訪問歯科スケジュール自動化.md`
- `doc/患者データ.csv` — 開発・デモの患者種まきソース（§6.20）。個人情報を仕様へ転記しない
- Cursor SDK スキル（`.cursor/skills-cursor/sdk/SKILL.md`）— AI裏処理（自動提案・ルート最適化）実装時の API 正本（§6.10）
- Cursor SDK 公式: https://cursor.com/docs/sdk/typescript — `@cursor/sdk` 参照

---

## 12. ✅ AI作業開始チェックリスト

AIは作業開始時に以下を確認する。

```text
□ PROJECT_MEMORY を読んだ
□ 関連する .cursor/rules を読んだ
□ 触るファイルと触らないファイルを分けた
□ 計算SSoTを確認した
□ 正データのDBテーブルを確認した
□ マスタ変更で過去分が塗り替わるか確認した
□ 手動修正・確定済みデータを上書きしない根拠を確認した
□ テスト期待値の根拠を確認した
□ 変更契約を提示した
□ 実装前に必要なら contract:pending した
□ ユーザー承認後に contract:approve した（whitelist 内だけ触る）
□ 調査委任は explore（read-only）、write 系は契約承認後のみ
□ Hard Boundary 差分なら isolate:status / worktree を検討した
□ 未反映の memory:candidates があれば一括再提示し、追記 or dismiss / learned した（チャット候補は --add 済みか）
□ pnpm run memory:audit で要詰めを確認し、理解レポート §6 に件数を書いた（§2.8）
□ 不具合対応なら Bug Fix 完成ゲート（§2.7）と完成宣言を守った
□ UI / 回帰確認なら §2.9（UI Polish / Regression Guard Graph・No progress・Context Budget）を守った
□ UI Polish なら §2.11（Interface Review `/better-interface`。Verdict が Block なら完成報告禁止）と §2.14（観察証拠: snapshot|screenshot を Read して差分1行）を守った
□ 完成報告なら §2.10（Claim Grounding / Working Graph。宣言は state/completion-declaration.md）を守った。UI Polish なら観察証拠欠落で stop（§2.14）
□ セキュリティ境界は §2.12（GPT非依存の `security:scan`。hook 自動実行はしない。必要なときだけ手動）を守った
□ プラットフォーム保安なら §6.52（シード一時表DROP・漏洩PW保護ON・DB SSL Enforcement ON。PITRは課金承認後）を守った
□ 雛形コピー直後なら Git 未初期化で scan skip になることを理解した。本開発開始前に `git init` した（§2.12）
□ フロント配下に `service role` / `service_role` 文字列をコメントでも書かない（§10.4）
□ 評価契約・失敗分類・敵対シナリオは §2.13（Future AGI 製品ではなく薄い型だけ。LLM-as-judge を司法の主にしない）を守った
□ 自動提案・ルート最適化の裏処理なら §6.10 / §6.11 / §6.12（Cursor SDK・開発local/本番Cloud・DB直結禁止・Adapter・HTTP MCP・self-hosted当面不要）を守った
□ 精度・導入ナレッジなら §6.13（構造化制約が正・電話確認から昇格・自然文の無確認ハード制約化禁止）を守った
□ SDK モデル選択なら §6.14 / §6.53（カスケードは後続。手動切替は grok-4.5 / grok-4.6 / composer-2.5。既定は grok-4.5。IDは list 確認）を守った
□ 認証・監査なら §6.15（サーバー側IP＝回線出口・clinic/memberships・端末UA要約・運営のみ `/auth-audit`・地図は件数をチップ行右端・九州は zoomSelector・在席はハートビート・IPブロックは回線共有前提文言・運営バイパス・§10.27/§10.28）を守った
□ ルート距離なら §6.16 / §6.39（`travelDistance.ts` で行列、生住所非渡与、住所必須、地図鍵を渡さない）を守った
□ サービス名・画面コピーなら §6.17（対外名はデンタクル。内部識別子は Detacle。装飾英語見出しを増やさない。SEOはサブタイトル側）を守った
□ 初期機能・導入なら §6.18 / §6.19（Apotool骨格＋ボタン1つ。v0はMustのみ。立ち上げ/既存の2レーン）を守った
□ 患者種まきなら §6.20 / §10.3（`doc/患者データ.csv`・Adapter経由・完成データ扱い禁止・個人情報をMEMORYに書かない・DB書込は合成CSV優先）を守った
□ ログイン画面UIなら §6.21 / §10.26（パスワード表示切替・カード内左寄せログイン＋縦線・背景白・広め余白・MFA確認は6マス＋コピペ一括・MFA中にPASS画面を出さない・Lucide禁止）を守った
□ 開発Authなら §6.22 / §10.5（メール確認オフ推奨・指定ログイン以外の検証ユーザー削除・パスワードをMEMORYに書かない）を守った
□ フォントなら §6.23（Zen Maru Gothic・本文500/14px/20px/`rgb(17,24,39)`）を守った
□ アプリヘッダーなら §6.24 / §10.6（クリニック名＋▼アカウントメニュー・単独ログアウト禁止・緑背景ロゴ枠なし・仮文字なし・ドロップダウン親に overflow-hidden 禁止・業務ナビはサイドバー§6.33）を守った
□ ユーザー管理なら §6.25 / §6.40（タイトル右隣検索・役割/状態フィルタなし・表＋10名固定ページネーション・招待ドロワー／作成モーダル・既存ユーザー所属追加・編集のみ／オーナーロックは UI＋RLS・招待 RPC で owner 不可・最終ログインは「—」可）を守った
□ セレクトUIなら §6.26（独自 Select のみ。ネイティブ見た目の select を増やさない。メニューは portal）を守った
□ 日付・時刻入力なら §6.43（DatePicker / TimePicker。ネイティブ type=date / type=time の見た目を増やさない。近傍ポップオーバー内 portal は §10.18）を守った
□ お支払い履歴なら §6.27（銀行振替前提・縦タイムラインUI。カード決済前提にしない）を守った
□ 契約者情報・契約情報なら §6.28（8項目表示・login_email独立・運営のみ書込・締結PDF）を守った
□ 運営スーパー権限なら §6.29 / §6.40（clinic_members非掲載・bootstrap に not is_platform_admin・is_platform_admin_user で所属拒否・全院アクセス・切替UI運営のみ・ユーザー管理除外・/proposals 運営専用は§6.34）を守った
□ カレンダー日付ナビなら §6.30 / §10.7（titleAside 横並び。グリッド上・右サイドに独立セクションを置かない）を守った
□ 患者管理なら §6.31（サイドバー内アコーディオンで一覧/電話確認・開閉は sessionStorage 保持・灰ピルの新規登録とデータ出力・データ統合しない）を守った
□ カレンダー運用なら §6.32 / §6.6（ドラッグ移動・リサイズ、楽観更新＋silent reload、手動→電話確認、NG取消＋同日再提案、日別メモ・空きブロック・残件・簡易週表示・日別CSVは見出しから外す・操作ログは§6.50、仮枠クリック確定は§6.35、空き枠埋めは§6.47）を守った
□ 左サイドバーなら §6.33 / §10.9（縦ナビ・grid.png 開閉・calendar/gears/patient/windows/ai・ログイン監査は運営のみ・自動提案ナビは運営のみ・fillViewport 右カラム min-h-0/min-w-0）を守った
□ カレンダー自動提案なら §6.34 / §10.20〜10.22（右上は遷移せず即実行・操作は titleAside 1行・nowrap・アイコンと文言密着・クリア／一括確定は近傍ポップオーバー・SDK Adapter・仮予約・グリッドのみスケルトン。/proposals は運営専用）を守った
□ 仮枠UI・クリック確定なら §6.35（点線仮枠・クリックで confirmed・楽観更新・moved 時のみ移動プレビュー・左緑バー／常時緑リサイズ禁止・電話確認 pending→ok）を守った
□ 空き枠埋めなら §6.47（副導線のみ・近接分最優先・住所必須明示・レート秒カウントダウン・決定論フォールバック・採用はクライアント・warnings 可・生住所非渡与。主導線を空き枠探しにしない）を守った
□ 操作ログなら §6.50（表形式日本語・fillViewport・操作/対象/クリニックSelect・ページネーション・全院時のみクリニック列）を守った
□ 設定画面なら §6.51 / §10.24（見出しSelectでセクション切替・導入タイプはSelect+1面・マスタは表パネル・sticky は border-separate）を守った
□ 患者住所・ジオコードなら §6.20 / §6.49 / §10.23（住所の正はApotool・CSVに住所なし・座標化して距離根拠・外れ値はNULL・latitude NULL は再実行）を守った
□ Cursor SDK 基盤なら §6.36 / §10.10（server/cursor・Private中 local・Cloud URL・鍵を VITE_ に出さない・health は CURSOR_HEALTH_SECRET Bearer 必須・公開DTO最小化）を守った
□ 本番公開／Vercel デプロイなら §6.36 / §10.10（`CURSOR_HEALTH_SECRET` とサーバー専用 `CURSOR_*` を Environment Variables へ。`VITE_` 禁止。未設定なら手順を案内）を守った
□ 割付精度ゲートなら §6.37（apply前の決定論hard/warn・travel_jump含む・棄却率停止・accuracy 保存）を守った
□ 運営AI利用状況なら §6.38 / §6.46 / §10.12（入口は `/proposals?view=usage`・見出しSelect切替・単独ナビ禁止・見出し右に横1行フィルタ・coin.png ポップオーバーで料金合計のみ・円換算160・精度UIなし・参照料金表は出さない）を守った
□ 運営AIハブなら §6.45 / §6.46（見出しSelectで画面切替・提案内もセクションSelect・fillViewport+sticky表・最近のジョブはクリニック絞り込み・再利用はジョブの clinic_id・サイドバーは自動提案1項目・旧 `/admin/ai-usage` はリダイレクト）を守った
□ 自動提案スナップショットなら §6.39（住所必須・距離行列・頻度/期限緊急度・schema v2・生住所非渡与）を守った
□ セキュリティ是正なら §6.40 / §10.11（clinic_members RLS 分割・運営除外・propose 60秒クールダウン・待機時間明示のレート制限文言・公開エラーは固定文言）を守った
□ Cloud 送信のコンプライアンスなら §6.12（UUID・制約中心。氏名・電話・生住所非渡与。DPA/同意を文書化）を守った
□ ナビ▼メニューなら §10.8（overflow で消さない。portal＋fixed。主導線はサイドバーアコーディオン）を守った
□ Cloud 起動時は `cloud` を明示したか（未指定で local に黙って落ちない）を確認した
□ エージェントに Supabase 直結・レセコン直結・service_role 渡しをしていないか確認した
□ 作業後に contract:close / session-allow 削除した
```

---

## 13. 更新履歴（人間が追記）

- `[YYYY-MM-DD]`: 初版作成
- `2026-07-18`: Hard Boundary PreToolUse ガード運用を §2.2 に追記（`/project-memory-learn`）
- `2026-07-18`: 変更契約ゲート運用を §2.3 に追記（`/project-memory-learn`）
- `2026-07-18`: サブエージェント権限運用を §2.4 に追記（`/project-memory-learn`）
- `2026-07-18`: MEMORY 追記候補リマインド（§2.5）と危険差分隔離（§2.6）を追記（`/project-memory-learn`）
- `2026-07-21`: Bug Fix 完成ゲート運用を §2.7 に追記（`/project-memory-learn`）
- `2026-07-21`: Memory Tighten（要詰め監査）運用を §2.8 に追記（`/project-memory-learn`）
- `2026-07-28`: ハーネス層強化（No progress / Context Budget / Graph横展開）を §2.9 に追記（`/project-memory-learn`）
- `2026-07-28`: 薄い知識Graph層（Claim Grounding / Working Graph）を §2.10 に追記（`/project-memory-learn`）
- `2026-07-29`: UI Polish Interface Review（better-interface / better-ui）を §2.11 に追記（`/project-memory-learn`）
- `2026-07-29`: Security harness（GPT非依存・stop hook 自動実行）を §2.12 に追記（`/project-memory-learn`）
- `2026-07-31`: §2.12 に Git 未初期化時 skip / 案件化時 git init / SECURITY_HOOK_DISABLE 案内禁止を追記（`/project-memory-learn`）
- `2026-08-05`: Quality Loop 思想の薄い取り込み（Future AGI 由来・製品なし）を §2.13 に追記（`/project-memory-learn`）
- `2026-08-06`: 訪問歯科スケジュール自動化の案件方針を §1 / §2.1業務コア / §3 / §6.5〜6.9 / §9 / §10 / §11 に追記（`/project-memory-learn`）
- `2026-08-06`: Cursor SDK 裏処理方針を §1 / §6.10〜6.11 / §10 / §11 / §12 に追記（`/project-memory-learn`）
- `2026-08-06`: Cursor SDK ランタイムを Cloud に決定。§1 / §6.10 / §12 を更新（`/project-memory-learn`）
- `2026-08-06`: エージェントデータ境界（DB非直結・正規化Adapter・HTTP MCP・開発local/本番Cloud・self-hosted当面不要）を §6.10 / §6.12 / §7 / §12 に追記（`/project-memory-learn`）
- `2026-08-06`: 精度最優先「制約を貯める」方針を §1 / §3 / §6.13 / §12 に追記（`/project-memory-learn`）
- `2026-08-06`: モデルカスケード方針（実装後続）を §1 / §6.14 / §12 に追記（`/project-memory-learn`）
- `2026-08-08`: 認証監査・Supabaseセキュリティ最優先・距離ベースルート（§6.8追記 / §6.15 / §6.16 / §3 / §7 / §12）を追記（`/project-memory-learn`）
- `2026-08-08`: サービス名「デンタクル」を §1 / §6.17 / §12 に追記（`/project-memory-learn`）
- `2026-08-08`: Apotool機能ベース・導入2レーン・v0 Must・患者CSV種まきを §1 / §6.5 / §6.9 / §6.18〜6.20 / §8.3 / §9 / §10.3 / §11 / §12 に追記（`/project-memory-learn`）
- `2026-08-08`: Security harness の hook 自動実行を無効化（§2.12 改定）。フロントコメントの service role 検知を §10.4 / §12 に追記（`/project-memory-learn`）
- `2026-08-09`: ログインUI（§6.21）・開発Auth運用（§6.22 / §10.5）・CSV検証は件数/合成優先（§6.20 / §8.3）を追記（`/project-memory-learn`）
- `2026-08-09`: ログイン上部をロゴ差し替え枠として §6.21 追記。基本フォント Zen Maru Gothic を §6.23 / §12 に追記（`/project-memory-learn`）
- `2026-08-09`: アプリヘッダー（アカウントメニュー・ロゴ枠）を §6.24 / §12、overflow-hidden クリップ再発防止を §10.6 に追記（`/project-memory-learn`）
- `2026-08-09`: ユーザー管理画面構成・招待＝既存ユーザー所属追加を §6.25 / §12 に追記（`/project-memory-learn`）
- `2026-08-09`: §6.25 を改定（検索は titleAside・役割/状態UI削除・10名固定・削除UIなし）。セレクト独自UIを §6.26 / §12 に追記（`/project-memory-learn`）
- `2026-08-09`: §2.5 改定（チャット候補は `--add` で永続化・`/project-memory-pending`・`--learned`）。会話ログ自動解析はしない
- `2026-08-09`: お支払い履歴（銀行振替・縦タイムライン）を §6.27 / §12 に追記（`/project-memory-learn`）
- `2026-08-09`: 契約者情報・契約情報（§6.28）とプラットフォーム運営スーパー権限（§6.29）を §12 とともに追記（`/project-memory-learn`）
- `2026-08-09`: ヘッダーロゴを緑枠なしテキストのみに §6.24 改定。カレンダー日付ナビを §6.30 / §10.7 / §12 に追記（`/project-memory-learn`）
- `2026-08-09`: 患者管理（§6.31）とナビ▼ overflow 再発防止（§10.8）を §12 とともに追記（`/project-memory-learn`）
- `2026-08-09`: カレンダー運用（§6.32）と電話確認連携追記（§6.6 / §6.19 前倒し注記 / §12）を追記（`/project-memory-learn`）
- `2026-08-10`: 左サイドバー業務ナビ（§6.33）・§6.24/§6.31 改定・fillViewport 横並び再発防止（§10.9）・§12 を追記（`/project-memory-learn`）
- `2026-08-10`: カレンダー自動提案の一括実行（§6.34）と §6.32/§6.33/§12 更新を追記（`/project-memory-learn`）
- `2026-08-10`: §6.34 を改定（確認モーダルなし・即実行・グリッドのみスケルトン）（`/project-memory-learn`）
- `2026-08-11`: `/proposals` 運営専用・仮枠点線UI・クリック本予約確定を §6.6 / §6.33 / §6.34 / §6.35 / §12 に追記（`/project-memory-learn`）
- `2026-08-11`: UI Polish 観察証拠（Observe Loop）を §2.14 / §11 / §12 に追記（`/project-memory-learn`）
- `2026-08-11`: 内部識別子を `home_dental_care` → `Detacle` に改定（§1 / §6.17 / §12）
- `2026-08-11`: カレンダー自動提案の SDK Adapter 接続・Day0補助化（§6.34改定）・SDK基盤（§6.36）・精度ゲート（§6.37）・運営AI利用状況（§6.38）・§12 を追記（`/project-memory-learn`）
- `2026-08-11`: 自動提案の住所必須・距離行列 SSoT・頻度/期限緊急度（§6.39）と §3 / §6.16 / §6.19 / §6.37 / §12 更新を追記（`/project-memory-learn`）
- `2026-08-11`: CursorヘルスAPIの認証必須・公開DTO最小化を §6.36 / §7 / §10.10 / §12 に追記（`/project-memory-learn`）
- `2026-08-11`: 本番公開時の `CURSOR_HEALTH_SECRET`（Vercel）設定義務と案内リマインドを §6.36 / §10.10 / §12 に追記（`/project-memory-learn`）
- `2026-08-11`: セキュリティ是正（clinic_members RLS・propose レート制限・公開エラー・Cloud 文書化）を §6.12 / §6.25 / §6.29 / §6.40 / §7 / §10.11 / §12 に追記（`/project-memory-learn`）
- `2026-08-11`: 運営AI利用状況の最終UI（§6.38改定）・フィルタ縦積み再発防止（§10.12）・ナビアイコン／患者アコーディオン保持（§6.31/§6.33）を追記（`/project-memory-learn`）
- `2026-08-11`: 未反映候補を整理し、カレンダー操作UI・導入タイプ/CSV・共通画面・患者/電話確認・運営自動提案UIを §6.41〜6.45、再発防止を §10.13〜10.14 に追記（`/project-memory-learn`）
- `2026-08-11`: 運営AIハブのピル切替（§6.46）と §6.33 / §6.38 / §6.45 / §12 更新を追記（`/project-memory-learn`）
- `2026-08-11`: カレンダー運用追記（クリア／一括確定・楽観更新・仮枠UI・レート制限文言）と空き枠埋め（§6.47）・再発防止（§10.15〜10.17）を追記（`/project-memory-learn`）
- `2026-08-11`: 独自 TimePicker（§6.43）と近傍ポップオーバー内 portal 再発防止（§10.18）を追記（`/project-memory-learn`）
- `2026-08-11`: 空き枠埋めの近接最優先・決定論フォールバックを §6.47 / §12 に改定（`/project-memory-learn`）
- `2026-08-11`: 未反映22件を反映。住所/ジオコード（§6.20/§6.49）・操作ログUI（§6.50）・設定UI（§6.51）・提案ハブ改定（§6.45/§6.46）・空き枠埋め追記（§6.47）・カレンダー見出し（§6.32/§6.34）・再発防止（§10.20〜10.24）・§12（`/project-memory-learn`）
- `2026-08-11`: ログイン画面からカード外ブランド枠を削除する仕様を §6.21 に改定（`/project-memory-learn`）
- `2026-08-11`: ログイン画面の広め余白方針を §6.21 に追記（`/project-memory-learn`）
- `2026-08-11`: ログイン背景は真っ白（緑パターンなし）を §6.21 に追記（`/project-memory-learn`）
- `2026-08-11`: 見出し帯ツールチップの portal 前面表示を §6.41 / §10.25 に追記（`/project-memory-learn`）
- `2026-08-12`: 契約者情報の運営向け編集UIを §6.28 に追記（`/project-memory-learn`）
- `2026-08-12`: プラットフォーム保安（S-01/S-02/S-07・PITR未完）を §6.52 / §7 / §12 に追記
- `2026-08-12`: S-10 クリニック作成運営のみ・S-05 ログイン監査・S-03 運営 TOTP を §6.15 / §6.29 / §7 に改定
- `2026-08-12`: MFA確認コードの6マス＋コピペ一括を §6.21 / §6.29 / §12 に追記（`/project-memory-learn`）
- `2026-08-12`: MFA中のログインフォームフラッシュ再発防止を §10.26 / §6.21 / §12 に追記（`/project-memory-learn`）
- `2026-08-12`: ログイン監査 UI（運営のみ `/auth-audit`）と推定地域列（表示時 GeoIP）を §6.15 / §6.29 / §12 に追記（`/project-memory-learn`）
- `2026-08-12`: 未反映4件を整理。ログイン監査2件は既反映を確認。ハーネス差分は §2.5 / §2.14 で充足。HB差分で §2.1 業務コア／共通判定のパスを固定。ログイン監査ナビアイコンを §6.33 に追記（`/project-memory-learn`）
- `2026-08-12`: ログイン監査の地図UI・Select切替・地方ズーム・clinic紐付け・IPブロックを §6.15 / §7 / §10.27 / §12 に追記（`/project-memory-learn`）
- `2026-08-12`: 在席ハートビート・件数テキスト配置・九州ズーム再発防止・IP回線共有文言を §6.15 / §7 / §10.28 / §12 に追記（`/project-memory-learn`）
- `2026-08-13`: 運営モデル切替に grok-4.6 を追加（既定は grok-4.5、カスケード未変更）を §6.14 / §6.36 / §6.38 / §6.53 / §12 に追記（`/project-memory-learn`）

