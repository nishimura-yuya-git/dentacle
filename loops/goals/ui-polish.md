# UI Polish Loop

機械ゲートの正本は `loops/goals/ui-polish-gate.md`（Context Budget で must）。このファイルの後半は窓から落ちてよい。

## Hard Gate

- 完成禁止: 内側パネルだけの観察、ページ枠照合なしの「寄せた/完成」、見本が専用シェルなのに `DashboardLayout` で包んだまま
- 画面種別: 業務UI / HP-LP / **文書シェル（専用ページ枠）**
- Iteration 0: **ページ枠** → 面 → タイポ → 主ボタン → 余白
- 観察: 見本キャプチャと実装キャプチャ（ページ全体）のペア。内側切り出しは無効
- Stop分割: 他画面ナビ変更は確認停止。対象画面のラッピング差は差し戻し（完成禁止）
- 既存コンポーネント優先は原子（Button / Modal）の話。ページ枠は見本に合わせる

## Goal

ユーザーが添付した見本画像、理想デザイン、指示文の意図を抽出し、一発目のUI出力品質を上げる。実装後は「完成と言ってよい根拠」を確認し、不足があれば小さく修正を回す。

「実装した」と自己申告しただけでは完成にしない。判定ノード（`loop:evaluator` + Regression Guard）が `pass`（または説明可能な `warn`）になるまで完成扱いにしない。ページ枠照合なしの完成申告も無効。

外部のブランド DESIGN.md（例: awesome-design-md）をそのまま落とさない。正本は `ui-design.mdc` / `ui-language.mdc` / `ui-design-hp-lp.mdc`。取り入れるのは「エージェントが読むデザイン契約の書き方」（トークン表・短い定型・Iteration順）だけ。

## Input

以下をそのまま渡してよい。

```text
UI Polish Loopで進めて。

対象画面:
（分かればURLやファイル）

理想画像:
（添付画像）

指示:
（ユーザーやお客さんの文章）

参考トーン（任意）:
（例: Appleの余白哲学のみ。色・フォントは案件ブランドに合わせる）
```

### Agent Prompt 定型（業務UI）

毎回ゼロから書かず、業務UIでは次を起点にする。値は `ui-design.mdc` を正とする。

```text
表面: canvas = #F0F9F0 / slate-50、surface = white + border-slate-100
主色: #008C01（CTA・選択・成功のみ。装飾に使わない）
文字: slate-900 / slate-700 / slate-400
余白: コンテナ p-6以上、モーダル p-8前後
影: 静かな境界線優先。elevated（強めの影）はモーダルのみ
禁止: Lucide、装飾英語、shadow-2xl、常時アニメ、紫グラデ、英語マーケUIの丸パクリ
完成判定: （3〜7個）
```

### Agent Prompt 定型（HP / LP）

HP/LPでは次を起点にする。値は `ui-design-hp-lp.mdc` と案件ブランドを正とする。

```text
FV: ブランド＋見出し＋短い補足＋CTA＋支配的な実画像（情報を詰め込まない）
余白: 最低24px、セクション間 py-20以上
CTA: 主副を明確。余白広め。大きなscale・bounce・発光禁止
写真: 高品質実画像。見切れなし
禁止: Lucide等、絵文字UI、低品質画像、意味の薄い英日二段見出しの量産
完成判定: （3〜7個）
```

## Required First Step

コードを書く前に、必ず以下を言語化する。

### 1. 画像から抽出すること

- **ページ枠（chrome）**: 見本が持つ枠（左レール / 専用ヘッダー / フッター / なし）。
- **negative inventory**: 見本が持たない枠（業務サイドバー、クリニック名ピル、ご意見 FAB 等）。見本に無いものは完成画面に残さない。
- レイアウト構造: 何が上/中央/下、左右、主従関係か。
- 余白: 広い余白か、高密度か、セクション間の呼吸感。
- 視線誘導: 最初に見せたい要素、次に押させたい操作。
- 色: 主色、背景色、状態色、強調色。
- 角丸・影・境界線: 丸み、立体感、静かな高級感。
- タイポグラフィ: 見出し、本文、補助文字のサイズ差。
- ボタン: 押したくなるか、主副の階層が明確か。
- 画像/キャラクター: 顔、持ち物、伝えたい要素が見切れていないか。
- モバイル/PC差: 片方の縮小で済ませていないか。
- 禁止事項: Lucide等の禁止アイコン、装飾英語、過剰アニメーション、チープな影。

### 2. 今回使うトークン表（必須・5〜15行）

抽象語で止めず、実装可能な名前付きトークンに落とす。外部ブランドの色・フォントはコピーしない。中身は既存ルールと案件ブランドを正とする。

業務UIの面階層例（白〜slate。dark ladder は使わない）:

```text
canvas: #F0F9F0 / slate-50
surface: white + border-slate-100〜200
elevated: モーダルのみ（控えめな影）
ink / ink-muted / ink-subtle: slate-900 / slate-700 / slate-400
primary: #008C01（CTA・focus・成功のみ）
radius: 既存コンポーネントに合わせる
shadow: 境界線優先。強影は elevated のみ
type: ページタイトル / セクション見出し / 本文 / 補助
spacing: コンテナ p-6+、モーダル p-8前後、セクション間の呼吸
```

HP/LPでは、上記に加えて FV・写真・CTA のトークン（余白・オーバーレイ・主副ボタン）を同じ行数で出す。

### 3. 意図と文脈

- ユーザーは何を「良い」と感じているか。
- 見本画像のどこを真似るべきで、どこはプロジェクト文脈に合わせて変えるべきか。
- 業務UIか、HP/LPか、**文書シェル（専用ページ枠）**か。ログイン後でも見本が専用シェルなら業務ダッシュボードで包まない。
- 操作導線を増やすべきか、説明として見せるべきか。
- 参考 DESIGN.md / 参考サイトがある場合は「構造・余白哲学のみ」。トークンの中身は既存ルールを正とする。

### 4. 完成判定

実装前に、完成条件を3〜7個に絞る。

例:

- ページ枠が見本と一致している（見本に無い業務枠が残っていない）。
- 主要操作が1秒で分かる。
- 見本画像と同じ余白・重心・視線誘導になっている。
- トークン表どおりの面階層・文字階層・主色の役割になっている。
- モバイルで見切れない。
- 画像の顔や重要アイテムが見える。
- 日本語文言だけで意味が伝わる。
- 禁止アイコンライブラリを使っていない。

## Graph（Sequential + 差し戻し）

外側の遷移はあらかじめ決める。内側の Iteration（ページ枠→面→タイポ→主ボタン→余白）だけ AI が判断する。

```text
① 画像・意図の抽出（ページ枠 / negative inventory / トークン表 / 完成判定）
  ↓
② 変更契約（必要時）
  ↓
③ 生成ノード（ページ枠→面→タイポ→主ボタン→余白の順で小さく修正）
  ↓
④ 判定ノード（loop:evaluate / loop:evaluator + Regression Guard）
  ├─ pass（または説明可能な warn）→ ⑤ 完成宣言 → 終了
  ├─ 差し戻し（再修正可能）→ ③ へ戻す（iteration +1）
  └─ stop / 上限到達 / No progress / 禁止衝突 → 人間確認で停止
```

図版: `loops/graphs/ui-polish.mmd`

| ノード | 役割 | 相当 |
|---|---|---|
| ①② | 入口・契約 | Sequential 前段 |
| ③ | UI 実装・調整 | 生成役（Loop 内側） |
| ④ | 完成ゲート | 評価役 / Callee の validator + Interface Review |
| ⑤ | 完成宣言 | escalate / LOOP_COMPLETE 相当 |
| 人間確認 | 停止 | Stop |

### Interface Review（判定ノード④の一部）

実装後・完成宣言前に、横断レビューを回す。正本は `.cursor/skills/better-interface/SKILL.md`（コマンド: `/better-interface`）。見た目細部は `.cursor/skills/better-ui/SKILL.md`。

| Mode | いつ | 上限 |
|---|---|---|
| `quick` | 差分が小さい、主経路だけ見れば足りる | HIGH/MEDIUM 最大5 |
| `full` | 見本画像からの一発出し、主要画面の作り直し | 最大15（empty/loading/error/狭幅含む） |

- 既定は read-only。Findings の実装は明示依頼時のみ。
- Verdict が `Block` なら完成報告禁止で ③ へ差し戻す。
- `Needs changes` で完成条件に関わる MEDIUM が残る場合も差し戻し（iteration 残時）。
- `Approve` または説明可能な軽微 LOW のみなら、完成宣言へ転記してよい。

## maxIterations

- 生成ノード ③ → 判定ノード ④ の往復は **最大 3 回**（`maxIterations: 3`）。
- 1 回の「往復」= 再修正を入れたうえで Evaluation を再実行した回数。
- 3 回で完成条件を満たせない、または同じ失敗が 2 回続く（`loop:evaluator` の No progress）場合は自動続行せず人間確認へ回す。
- 回数は報告の「完成宣言」に明記する。

## 完成条件（チェックリスト）

すべて満たしたときだけ完成扱いにできる。

1. 画像/指示から意図・トークン表・完成判定（3〜7個）を実装前に出している。
2. 業務UI / HP/LP / 文書シェルの判定と適用ルールが明示されている。
3. Iteration 順（**ページ枠** → 面 → タイポ → 主ボタン → 余白）で小さく直している。
4. 修正範囲が最小で、変更契約・Hard Boundary ルールに違反していない。
5. Regression Guard を実行し、`pass` または説明可能な `warn` である。
6. `pnpm run loop:evaluate` / `loop:evaluator` が `stop` ではない（`warn` は根拠を残す）。
7. Interface Review（`/better-interface` quick または full）を実施し、Verdict が `Block` でない。完成宣言に mode / Verdict / Findings 件数を書いている。見本に無い業務枠が残っている Layout Finding は HIGH とし、Approve しない。
8. 未確認の表示ポイントがある場合、理由と次の確認方法を報告している。
9. Observe Loop: 画面を動かしたうえで snapshot または screenshot を取得し、**Read して差分を1行以上書いた観察証拠**がある。キャプチャ未読の完成申告は無効。
10. **ページ枠照合**: 見本キャプチャ（または「なし（指示のみ）」）と実装キャプチャ（ページ全体）を Read し、sidebar / header / FAB / footer / rail の差分を1行以上書いている。内側パネルだけのスクショでは完成無効。

## Implementation

- 原子コンポーネント（`Button` / `Modal` / `Toast`）は既存を優先する。
- ページ枠は見本に合わせる。見本が専用シェルなら、対象画面を `DashboardLayout` で包んだまま完成にしない。
- 一度で完成扱いにしない。
- 実装後にブラウザ表示、スクリーンショット、または差分確認を行う。内側パネルだけでなくページ全体を撮る。
- 見本画像との差分を再度言語化する。ページ枠の有無を先に書く。
- 不足があれば余白、サイズ、位置、文言、画像位置を小さく修正する。

### Iteration 順（Evaluation 前に必須）

一度に全部直さない。次の順で小さく回す。

0. ページ枠（chrome / negative inventory）
1. 面の階層（canvas / surface / elevated）
2. タイポ階層（ink / 見出し・本文・補助）
3. 主ボタン（primary の役割と余白）
4. 余白・見切れ（PC/モバイル）

## 差し戻し条件

以下のときは完成報告を禁止し、生成ノードへ差し戻す（iteration が残っている場合）。

- `loop:evaluator` または `loop:evaluate` が `stop`。
- Regression Guard が `stop`、または必須チェック失敗。
- Interface Review の Verdict が `Block`。または完成条件に関わる `Needs changes` が残っている。
- 完成条件チェックリストのいずれかを満たしていない。
- 「実装した」と書いたが、完成判定との照合結果が示されていない。
- 観察証拠が無い、またはキャプチャ／snapshot を Read せずに見た目OKと書いている。
- ページ枠照合が無い、または内側パネルだけのスクショで「寄せた」と書いている。
- 見本が専用シェルなのに、対象画面が業務ダッシュボード枠のまま。

差し戻し時は、失敗した完成条件番号と、次に直す最小アクションを1〜3個だけ書く。

## Stop

以下の場合は停止して確認する（差し戻しループに入れない）。

- 添付画像の意図が読み取れない。
- 業務UI / HP/LP / 文書シェルのどれを適用すべきか不明。
- 見本の再現がプロジェクト禁止事項に反する。
- 必要な画像素材が存在しない。
- **他画面**の導線・グローバルナビを変える必要がある（対象画面のラッピング変更は Stop ではなく差し戻し）。
- 外部ブランド DESIGN.md を root に置いて既存トークンを上書きしようとしている。
- `maxIterations`（3）に到達した。
- No progress（同じ失敗シグネチャが 2 回連続）。

## Evaluation

標準評価は以下。

```bash
pnpm run loop:ui
pnpm run type-check
pnpm run check:hard-boundaries
pnpm run check:architecture
pnpm run loop:evaluate
pnpm run loop:evaluator
```

加えて判定ノードで Interface Review を実施する（エージェント手順。機械コマンドではない）:

```text
/better-interface quick   # 小さな差分
/better-interface full    # 主要画面の一発出し・作り直し
```

画面変更ではブラウザ確認を行う。知覚の優先順位は次のとおり（vision ループは最終手段）。

```text
1. シェル / 型チェック / 単体
2. browser_snapshot（構造）
3. screenshot（見た目）
4. vision による推測は最終手段
```

### Observe Loop（必須・完成前）

```text
動かす → snapshot または screenshot → 画像/構造を Read → 差分を書く → 直す → もう一度
```

- クリックや保存が例外なく通っても、期待画面になったとはみなさない（Verify, don't assume）。
- 「見た目OK」「寄せた」はキャプチャ／snapshot を Read したあとにだけ書いてよい。
- 観察は **見本キャプチャと実装キャプチャのペア**。実装側はページ全体（枠を含む）。内側パネルだけの切り出しは完成根拠にしない。
- 完成宣言に `ページ枠照合`（見本 / 実装 / 差分 / Read済み）が無い UI Polish は `stop`（欠落コード `observe-chrome`）。
- Claim Grounding / Eval template は観察証拠欠落およびページ枠照合欠落を `stop` にする。

色・ボタン・タイポの静的プレビュー（preview.html 的カタログ）は任意。業務コア優先なら Loop 定義の強化より後回しでよい。

## 完成宣言（必須）

完成報告の末尾に、次を必ず含める。自己申告の「完了しました」だけの報告は無効。

```markdown
## 完成宣言（UI Polish Loop）

- iteration: N / 3
- 完成条件: 1□ 2□ 3□ 4□ 5□ 6□ 7□ 8□ 9□ 10□（満たした番号を明示）
- トークン表: 提示済み / 未提示
- Evaluation:
  - コマンド: …
  - 結果: pass / warn / stop
  - warn の根拠: …（warn 時のみ）
- Regression Guard: pass / warn / stop
- Interface Review: quick|full / Block|Needs changes|Approve
- Findings: HIGH n / MEDIUM n / LOW n（または なし）
- 観察証拠:
  - 種別: snapshot | screenshot
  - パス: `artifacts/...` または MCP 取得名
  - Read済み: はい（差分・問題点を1行）
- ページ枠照合:
  - 見本: `path` または なし（指示のみ）
  - 実装: `path`（ページ全体。内側パネルだけの切り出しは不可）
  - 差分: sidebar / header / FAB / footer / rail など枠の有無を1行以上
  - Read済み: はい
- 未検証: …（なければ「なし」）
- Stop非該当の根拠: …
- 根拠リンク: `path/to/file` または PROJECT_MEMORY.md §x.x（必須）
- Working Graph: 追加した Entity / Relation の要約（なければ「なし」）
```

完成報告時は宣言本文を `state/completion-declaration.md` に書き、`pnpm run loop:evaluator` の Claim Grounding を通す。観察証拠が無い、またはページ枠照合が無い UI Polish 宣言は `stop`。

## Output

- 画像から抽出した意図
- 今回使うトークン表（5〜15行）
- 現状との差分
- 完成判定
- Iteration で直した順（ページ枠 → 面 → タイポ → 主ボタン → 余白）
- 実装内容
- 確認した表示ポイント
- 未確認項目と理由
- 完成宣言

## 外部 DESIGN.md との関係

| 取り入れる | 取り入れない |
|---|---|
| トークン表の書き方 | Linear / Stripe / Vercel 等を root にコピー |
| Agent Prompt 定型 | 紫・黒・英語マーケ前提の見た目 |
| Iteration の順序 | HP/LP演出の業務画面への持ち込み |
| Surface ladder の考え方（白〜slate） | 「高級だから」外部ブランドの丸採用 |
| jakubkrehel/skills のレビュー司令塔・数値レシピ（`better-interface` / `better-ui`） | OKLCH強制移行、英語 writing のまま、全面強影、禁止アイコン |

将来、トークンが安定し Stitch 互換が必要になったときだけ、既存ルールの要約インデックスとして DESIGN.md を追加する。当面は新規 DESIGN.md を作らない。
