# 🧠 PROJECT_MEMORY.md

> このファイルは **プロジェクト横断で使える長期記憶テンプレート** です。
> 実案件へ導入するときは、`[ ]` のプレースホルダをその案件の内容に置き換えてください。
> AI（Cursor / Claude / その他LLM）は作業開始時に必ず読み、ここに書かれた境界・不変条件を優先します。
> **AIによる自動編集は禁止。更新提案はチャットで提示し、人間が反映してください。**

---

## 1. プロジェクト概要

| 項目 | 内容 |
|---|---|
| プロジェクト名 | 訪問歯科スケジュール自動化（`home_dental_care`） |
| サービス名 | **デンタクル**（対外・画面向けブランド名。内部識別子は `home_dental_care` のまま可。§6.17） |
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
| スケジュール自動提案 | 要確認（実装時にファイル・テーブルを固定） | 割付ズレ、重複訪問、制約無視の配置 |
| ルート最適化 | 要確認（実装時にファイル・テーブルを固定） | 移動過多、施設まとめ崩れ、車両/チーム偏り |
| 電話確認→本予約化 | 要確認（実装時にファイル・テーブルを固定） | 未確認の本予約化、NG後の再提案漏れ |
| 患者訪問条件 | 要確認（患者カルテ相当） | 頻度・曜日・医師同行などの制約欠落 |

#### 共通計算・共通判定

- 自動提案ロジック（SSoT・ファイル未確定） — 対象患者抽出・仮配置・制約判定の計算根拠
- 予約/電話確認ステータス解決（SSoT・ファイル未確定） — 仮予約と本予約、電話結果の優先順位
- ルート最適化（SSoT・ファイル未確定） — エリア/施設まとめ・移動時間・平準化
- 権限判定（SSoT・ファイル未確定） — 管理者 / コール / コーディネーター / 医師 / DH 等

これらは **importして使う**。コピー・再実装・シグネチャ変更は禁止。
ファイルパスは実装着手時に確定し、確定後は Hard Boundary として扱う。

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

### 2.5 MEMORY 追記候補の自動リマインド（2026-07-18 決定）

- `PROJECT_MEMORY.md` は AI が自動編集しない（この原則は維持）。
- `sessionEnd` で差分・契約ゲート・ハーネス変更から追記候補を生成し、`state/memory-candidates.json` に保存する。
- `sessionStart` で未反映候補があれば `additional_context` としてリマインドする。
- 会話ログは候補に使わない。古い候補は stale（要再確認）とする。
- 反映はユーザーが `/project-memory-learn` を明示実行したときだけ。破棄は `pnpm run memory:candidates -- --dismiss <id>`。
- 無効化: `MEMORY_CANDIDATES_DISABLE=1`
- 関連: `scripts/lib/memory-candidates.mjs`, `scripts/memory-candidates.mjs`, `docs/agent-loop-harness.md` §15.4

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

### 2.12 Security harness（GPT非依存・stop hook 自動実行）（2026-07-29 決定 / 2026-07-31 追記）

- セキュリティ検証レイヤは **OpenAI / Codex Security 製品に依存しない**。借りるのは差分スキャン / knowledge-base / findings / severity の型だけ。
- 正本コマンド: `pnpm run security:scan`（成果物 `state/security-findings.json`）。CI は `.github/workflows/security-harness.yml`（APIキー不要）。
- `CODEX_SECURITY_API_KEY` 前提の実装に戻さない。自動 patch / 自動修復は入れない（変更契約・Hard Boundary と衝突しやすい）。
- Cursor hook で自動実行する:
  - `stop`: `test:security-scan` + working-tree scan + diff scan をバンドル実行。失敗時は `followup_message` で完成報告を差し戻す
  - `sessionStart`: 前回失敗が残っていればリマインド
- 編集のたびにスキャンしない。完成時（stop）にまとめて走る。
- **Git 未初期化時（雛形コピー直後など `.git` 無し）**: working-tree / diff スキャンは fail せず **skip（exit 0）**。`test:security-scan`（unit）は実行してよい。完成差し戻しの原因にしない。
- **案件化・本開発開始時**: `git init`（必要なら初回コミット）してから実装する。以降は通常どおり差分スキャンが有効になる。雛形同梱での自動 `git init` はしない（親リポ / Obsidian 配下との衝突を避ける）。
- 緊急回避 `SECURITY_HOOK_DISABLE=1` は常用禁止。**失敗 followup に案内しない**（実装は残すが常用させない）。
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

---

## 3. 🔑 Single Source of Truth（SSoT）

業務上重要な計算・判定・表示優先度は、必ず1箇所に集約する。

| 領域 | SSoT | 役割 | 参照する画面・処理 |
|---|---|---|---|
| 訪問スケジュール自動提案 | 要確認（関数・ファイル未確定） | 対象抽出・制約適用・仮配置 | スケジュール自動提案、訪問カレンダー |
| ルート最適化 | 要確認（関数・ファイル未確定） | エリア/施設まとめ・移動時間・平準化 | 自動提案、日別訪問表 |
| 電話確認→本予約 | 要確認（関数・ファイル未確定） | 仮予約/本予約/再提案の判定 | 連絡者リスト、カレンダー |
| 患者訪問条件 | 要確認（関数・ファイル未確定） | 頻度・曜日・時間帯・医師同行等の正 | 患者カルテ、自動提案 |
| 構造化制約（NG/不在/可能枠） | 要確認（テーブル・ファイル未確定） | 割付精度の正。自由記述Wikiではない（§6.13） | 制約マスタ、電話確認昇格、割付ジョブ |
| 距離行列（住所→移動根拠） | 要確認（計算SSoT・ファイル未確定） | 座標/距離の算出。エージェントは結果を読むだけ（§6.16） | 割付ジョブ、ルート最適化 |
| ログインIP・認証監査 | 要確認（`auth_audit_logs` 等） | 誰がいつどこから認証したか（§6.15） | 管理画面、セキュリティ監査 |

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

### 6.6 仮予約 → 電話確認 → 本予約（2026-08-06 決定）

- 自動提案で作る予約は原則「仮予約」。
- 電話確認が必要な患者は連絡リスト化し、結果を OK / NG / 不在 / 折返し待ち / 施設確認待ち 等で記録する。
- 電話確認済みだけを本予約に昇格する。NG時は次候補を再提案する。
- 連絡者リストとカレンダーを連動させる。
- 関連: 連絡者リスト、訪問予約ステータス、電話確認ステータス

### 6.7 自動提案の考慮変数（2026-08-06 決定）

患者条件の正として扱い、画面ごとに独自再計算しない。

- 訪問頻度、訪問種別、医師同行、担当医・担当衛生士
- 訪問可能曜日・時間帯、NG日
- 施設・居宅区分、住所・エリア、同一施設まとめ可否
- 標準診療時間、移動時間
- 電話確認要否・ステータス、優先度
- 前回訪問日、次回訪問期限

### 6.8 ルート最適化の方針（2026-08-06 決定 / 2026-08-08 追記）

- エリアごとに患者をまとめる
- 同一施設の患者を連続配置する
- 車両・チームごとの移動負担を平準化する
- 医師同行必須患者を医師出勤枠内に寄せる
- 月1回患者を月内空き日に分散する
- 毎週患者を固定曜日・固定時間に近づける
- **1日ルートは住所（または正規化済み座標）間の距離を根拠に最適化する**（Cursor SDK Cloud 裏処理。§6.10 / §6.16）

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

### 6.12 エージェントのデータ境界・外部連携（2026-08-06 決定）

- **エージェントに Supabase / DB を直結させない。** service_role や DB 接続情報をエージェントへ渡さない。
- アプリ側が割付ジョブ（または同等の中間データ）を用意し、エージェントはそれを読んで構造化結果を書き戻す。正データは Supabase に置き、画面表示用の氏名等はアプリが結合する。
- エージェント入力は割付に必要な制約中心（患者ID、頻度、曜日・時間帯、NG、エリア/施設、診療時間、医師同行、優先度等）。氏名・電話・詳細住所・カルテ丸ごとを原則渡さない（粒度の細部は実装時に詰める）。
- **レセコン等の外部 API は正規化 Adapter 経由のみ。** エージェントがレセコンを直接叩かない。取り込んだデータは訪問条件マスタ等へ正規化してから割付に使う。
- Cloud からツール連携する場合の MCP は **HTTP MCP** を使う。`headers` / `auth` は SDK 経由。stdio MCP の `env` に鍵を載せることは避ける。
- 関連: §6.10、Supabase、レセコン連携、スケジュール自動提案、§6.13

### 6.13 精度最優先: 知識ではなく制約を貯める（2026-08-06 決定）

ゴールは精度。導入ナレッジの百科事典化はしない。

- **正データは構造化制約マスタ**（不在・NG・可能枠など）。「知識を覚えさせる」のではなく「制約を貯める」。
- デイサービス等のクリニック固有事情は、物語や自由記述Wikiではなく `patient_id + 曜日/時間帯のNG（または不在）` として持つ。事情の説明文はハード制約にしない。
- **導入 Day0 は最小入力で仮案を出せる**設計にする（頻度・可能曜日・施設/エリア等）。全患者の全事情の事前入力を必須にしない。
- **精度エンジンは電話確認**: NG理由から制約候補を出し、**人の確認後**に恒久制約へ昇格する。確認なしの自動確定はしない。
- レセコン/CSV の種まきは頻度・施設・前回日等に限定する。事情本文をハード制約にしない（正規化 Adapter 経由は §6.12）。
- **禁止**: クリニック長文ナレッジをエージェント精度の主源にすること。自然文メモや AI 抽出を、確認なしでハード制約化すること。
- 関連: §6.6、§6.7、§6.12、連絡者リスト、制約マスタ、オンボーディング

### 6.14 モデルカスケード（実装は後続・2026-08-06 方向）

製品の Cursor SDK 裏処理で使うモデルの段階切替方針。実装は先送り、方向性のみ確定。

- **0〜50%**: ベースモデル = Grok 4.5
- **50%超〜99%**: Composer 2.5
- **100%**: other = GPT 5.6 Sol
- 閾値の「%」は Cursor モデルプラン相当の使用率を指す。取得元（Dashboard API 等）が公式で読めるかは要確認。読めない場合は自前の月次トークン/金額メータで閾値を再現する。
- **切替はアプリ側のモデルルーター**で行い、`Agent.create` / `prompt` 前に `model` を選ぶ。Cursor IDE/SDK の limit 時自動フォールバックに任せない（公式にこのカスケード設定はない）。
- モデル ID はハードコード前に `Cursor.models.list()` で実 ID を確認してから固定する。
- 関連: §6.10、Cursor SDK Cloud、スケジュール自動提案

### 6.15 ログインIP・認証監査（2026-08-08 決定）

- 「誰が・いつ・どこからログインしたか」を追跡する。正は自前の認証監査テーブル（例: `auth_audit_logs`。正式名は実装時確定）。
- 記録経路: Supabase Auth Hook または Edge Function（サーバー側）。イベント例: ログイン成功 / 失敗 / ログアウト。
- 記録項目の目安: `user_id`, `clinic_id`（該当時）, `event`, `ip`, `user_agent`, `created_at`。
- **IP はサーバー側で取得する。** ブラウザから送った IP 文字列を正としない（改ざん防止）。
- 閲覧は管理者のみ（RLS）。ログイン系監査と業務操作ログ（予約変更等）はテーブル/責務を分離する。
- エージェント（Cursor SDK）経路に監査テーブルを直結させない（§6.12）。
- 関連: Supabase Auth, Edge Functions, §7

### 6.16 距離算出とルート最適化の責務（2026-08-08 決定）

- 1日の訪問ルート最適化は Cursor SDK（Cloud）で行う。
- **住所→座標 / 距離行列の算出はアプリ側（または確定した計算 SSoT）** で行い、割付ジョブに載せる。
- エージェントは距離付きスナップショットを読んで訪問順を最適化する。地図 API 鍵や DB 直結をエージェントに渡さない。
- §6.8 のエリアまとめ・同一施設連続配置と併用する。
- 関連: §6.8, §6.10, §6.12, 割付ジョブ

### 6.17 サービス名「デンタクル」（2026-08-08 決定）

- 本システムの対外・画面向けサービス名は **デンタクル**（カタカナ）とする。
- リポジトリ名・内部識別子（`home_dental_care` 等）は変更しなくてよい。ブランド表記と内部識別子を混同しない。
- 表記の正はカタカナ「デンタクル」。英語併記が必要な場合のみ副表記（例: Dentacle）とし、主表記はカタカナのまま。装飾英語の見出しを増やさない（`ui-language.mdc`）。
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

患者カルテの Day0 最小項目: 氏名、カルテ番号（任意）、担当医、訪問頻度（仮可）、可能曜日（仮可）、施設orエリア（ざっくり可）、前回訪問日、住所（無ければエリアだけで仮案）。

**v0では入れない（後段）**: リッチなダッシュボード本画面、Medical Box、SMS/LINE/AI電話、Web予約、掲示板、シフト本格、技工物、分析、Excel/印刷フル、操作ログ本格UI、日別/チーム別のきれいな帳票。操作の裏traceは残してよい。

- 関連: §6.5, §6.9, §6.18

### 6.20 テストデータ種まき（`doc/患者データ.csv`・2026-08-08 決定）

- 開発・デモの患者種まきソースは `doc/患者データ.csv` とする（既存クリニック導入の模擬にも使う）。
- 投入は正規化 Adapter 経由のみ（§6.12）。レセコン直結禁止。
- 初期マッピング対象の目安: カルテ番号、氏名（漢字/カナ）、主担当医、最終日付（前回訪問日の種）。請求・点数など会計列は初期は無視してよい。
- CSVに無い前提の項目: 住所、施設、エリア、訪問頻度、可能曜日、NG、医師同行、連絡先 → 後追い入力 / 電話確認で育成。
- **CSVは訪問条件の完成データではない。** 取込完了＝導入完了とみなさない（§6.18）。
- MEMORY・コミットメッセージ・Issue に患者の氏名・カルテ番号などの個人情報を転記しない。開発利用時のマスキング／サンプリング方針の細部は要確認。
- 関連: `doc/患者データ.csv`, §6.12, §6.13, §6.18, §8.3, §10.3

---

## 7. 🔐 RLS・権限・セキュリティ

| テーブル・API | 読み取り | 作成 | 更新 | 削除 | 注意点 |
|---|---|---|---|---|---|
| 認証監査（例: `auth_audit_logs`） | 管理者 | サーバーのみ | 原則不可 | 原則不可 | クライアントIP申告禁止（§6.15） |
| `[table_a]` | `[role]` | `[role]` | `[role]` | `[role]` | `[制約]` |
| `[table_b]` | `[role]` | `[role]` | `[role]` | `[role]` | `[制約]` |

### 必須

- **Supabase をセキュリティ最優先で採用する。** RLS必須。`.cursor/rules/supabase-security-*.mdc` に準拠する。
- 管理者・本人・所属組織などの権限境界を明記する
- 既存RLSの削除・弱体化は禁止
- 秘密情報をログ・フロント・コミットに出さない
- `service_role` はサーバーのみ。Cursor Cloud エージェントへ Supabase / DB 直結認証を渡さない（§6.12）
- ログインIP監査はサーバー側取得のみ。クライアント由来IPを正にしない（§6.15）
- 患者・予約・制約・監査の正データは Supabase に置く

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
- `loops/goals/ui-polish.md` / `loops/graphs/ui-polish.mmd` — UI Polish 完成ゲート（Interface Review 含む・§2.11）
- `.cursor/skills/better-interface/SKILL.md` / `.cursor/commands/better-interface.md` — 横断 Interface Review 司令塔
- `.cursor/skills/better-ui/SKILL.md` — UI polish 細部レシピ（既存トークン準拠）
- `loops/goals/regression-guard.md` / `loops/graphs/regression-guard.mmd` — Regression Guard 完成ゲート
- `scripts/lib/loop-progress.mjs` — No progress ブレーキ
- `scripts/lib/context-budget.mjs` — Context Budget（must / compress / drop）
- `scripts/lib/claim-grounding.mjs` — Claim Grounding（主張↔根拠）
- `scripts/lib/working-graph.mjs` / `scripts/working-graph.mjs` — Working Graph（薄い共有メモリ）
- `scripts/cursor-safety-guard.mjs` — PreToolUse ガード（変更契約 + Hard Boundary）
- `scripts/change-contract-gate.mjs` — 変更契約ゲート CLI
- `.cursor/subagent-policy.json` — サブエージェント権限定義
- `scripts/cursor-subagent-guard.mjs` — subagentStart ガード
- `scripts/memory-candidates.mjs` — PROJECT_MEMORY 追記候補 CLI
- `scripts/memory-audit.mjs` — PROJECT_MEMORY 要詰め監査 CLI（Memory Tighten）
- `.cursor/commands/project-memory-audit.md` — 要詰め監査コマンド
- `scripts/isolate.mjs` — 危険差分の worktree / shadow 隔離 CLI
- `scripts/security-scan.mjs` / `pnpm run security:hook` — GPT非依存セキュリティ差分スキャン（§2.12）
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
□ 未反映の memory:candidates があれば追記 or dismiss した
□ pnpm run memory:audit で要詰めを確認し、理解レポート §6 に件数を書いた（§2.8）
□ 不具合対応なら Bug Fix 完成ゲート（§2.7）と完成宣言を守った
□ UI / 回帰確認なら §2.9（UI Polish / Regression Guard Graph・No progress・Context Budget）を守った
□ UI Polish なら §2.11（Interface Review `/better-interface`。Verdict が Block なら完成報告禁止）を守った
□ 完成報告なら §2.10（Claim Grounding / Working Graph。宣言は state/completion-declaration.md）を守った
□ セキュリティ境界・完成時は §2.12（`security:scan` / stop hook。OpenAI 製品依存に戻さない）を守った
□ 雛形コピー直後なら Git 未初期化で scan skip になることを理解した。本開発開始前に `git init` した（§2.12）
□ 評価契約・失敗分類・敵対シナリオは §2.13（Future AGI 製品ではなく薄い型だけ。LLM-as-judge を司法の主にしない）を守った
□ 自動提案・ルート最適化の裏処理なら §6.10 / §6.11 / §6.12（Cursor SDK・開発local/本番Cloud・DB直結禁止・Adapter・HTTP MCP・self-hosted当面不要）を守った
□ 精度・導入ナレッジなら §6.13（構造化制約が正・電話確認から昇格・自然文の無確認ハード制約化禁止）を守った
□ SDK モデル選択なら §6.14（Grok 4.5 → 50%超 Composer 2.5 → 100% GPT 5.6 Sol。自前ルーター。IDは list 確認）を守った
□ 認証・監査なら §6.15（サーバー側IP・auth監査テーブル・管理者のみ閲覧・クライアントIP禁止）を守った
□ ルート距離なら §6.16（距離算出はアプリ/SSoT、エージェントは距離付きジョブを読む。地図鍵を渡さない）を守った
□ サービス名・画面コピーなら §6.17（対外名はデンタクル。装飾英語見出しを増やさない。SEOはサブタイトル側）を守った
□ 初期機能・導入なら §6.18 / §6.19（Apotool骨格＋ボタン1つ。v0はMustのみ。立ち上げ/既存の2レーン）を守った
□ 患者種まきなら §6.20 / §10.3（`doc/患者データ.csv`・Adapter経由・完成データ扱い禁止・個人情報をMEMORYに書かない）を守った
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

