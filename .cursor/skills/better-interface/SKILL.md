---
name: better-interface
description: >-
  画面・フロー・機能の横断インターフェースレビュー。better-ui と既存の ui-design / ui-language ルールを束ね、
  quick/full で Findings と Verdict を出す。UI Polish Loop の判定ノード、見た目・余白・操作導線・コピーの
  総合監査、「インターフェースを見て」「UIレビューして」で使う。Triggers on better-interface, interface review,
  UI監査, 横断レビュー, holistic UI review, /better-interface。
---

# インターフェースを一枚のシステムとしてレビューする

強いUIは、領域別メモの寄せ集めではない。体験全体を見て、各領域の正本に従い、1つの優先付き Verdict にまとめる。

このスキルは **オーケストレーションだけ** を持つ。見た目の細部は `better-ui`、業務UIのトークン・状態色・レイアウト標準は `ui-design.mdc`、HP/LPは `ui-design-hp-lp.mdc`、文言は `ui-language.mdc` を正とする。外部スキルの見た目トークンで既存ルールを上書きしない。

出典の考え方: [jakubkrehel/skills](https://github.com/jakubkrehel/skills) の `better-interface`（MIT）。本プロジェクト向けに日本語化し、ドメイン所有者を案件ルールへ差し替えている。

## いつ使うか

- ユーザーが `/better-interface` または UI横断レビューを依頼したとき
- UI Polish Loop の判定ノード（実装後・完成宣言前）で Interface Review を回すとき
- 「見た目は直したつもり」だが完成根拠が薄いとき

既定は **read-only**。Findings の実装まで求められたときだけコードを触る。

FAB・オーバーレイ・アプリ内チャットがある画面では、見出し重複・説明重複・主ボタン階層・モバイルでのFAB衝突を Layout の必須検査にする。観察で阻害を書いたまま Approve しない。

## Core Principles

### 1. スコープとモードを先に決める

依頼とワークスペースから、画面・フロー・機能・リポジトリ範囲を推定し、出力に明記する。モード未指定なら `full`。

| Mode | カバレッジ | Finding 上限 |
| --- | --- | --- |
| `quick` | 主経路と高頻度状態。`HIGH` / `MEDIUM` のみ | 5 |
| `full` | 依頼スコープ全体。empty / loading / error / 狭幅を含む | 15 |

範囲が広すぎて信用できる検査ができないときは、最も交通量の多い完結フローに絞り、境界を書く。未検査の面を検査済みと書かない。

### 2. 偵察してから判断する

フレームワーク、スタイリング（Tailwind 等）、コンポーネントライブラリ、デザイントークン、対応 viewport、利用可能な preview / test コマンドを確認する。プロジェクトの既存記法に合わせる。第2のスタイリング方式を持ち込まない。

### 3. ドメイン正本を使う（読み込み順）

レビュー前に、下表の正本が読めるか確認する。無い場合はそのドメインを `Not reviewed` とし、理由を書く。記憶でルールを再発明しない。

| 順 | ドメイン | 正本 | 見るもの |
| --- | --- | --- | --- |
| 1 | Accessibility | `.cursor/rules/ui-design.mdc`（アクセシビリティ節） | focus、キーボード、aria-label、hit area、色だけに頼らない状態 |
| 2 | Layout | `.cursor/rules/ui-design.mdc` / `ui-design-hp-lp.mdc` | 余白、階層、モバイル別設計、見切れ、見出し重複、オーバーレイ衝突 |
| 3 | Writing | `.cursor/rules/ui-language.mdc` | 日本語優先、装飾英語禁止、空状態・エラーの次行動 |
| 4 | Typography | `.cursor/rules/ui-design.mdc`（タイポ節） | 見出し/本文/補助の階層。業務UIで装飾明朝の乱用なし |
| 5 | Colors | `.cursor/rules/ui-design.mdc`（カラー節） | canvas/surface、主色 `#008C01` の役割、状態色の一貫性 |
| 6 | UI polish | `.cursor/skills/better-ui/SKILL.md` | 同心円角丸、optical alignment、motion restraint、`transition: all` 禁止 |

基礎（a11y / layout / writing）を後回しにして polish だけで Approve しない。

同じ問題が複数ドメインにまたがるときは、**根本ルールの所有者**に1回だけ載せ、副次影響は Why に書く。

### 4. 証拠必須

各 Finding は `path/to/file:line` と現状実装を示す。ソースが無い成果物なら、画面名とコンポーネント名を正確に書く。見た目だけの推測でコード指摘をしない。実行時挙動が決める事項は、レンダー確認か **Not verified** にする。

### 5. ユーザー影響で並べる

共有 severity:

- `HIGH`: タスク阻害、誤誘導、操作/内容の隠蔽、データ損失リスク、繰り返し起きる系統障害
- `MEDIUM`: 理解・効率・適応・一貫性を実質的に損なう
- `LOW`: 局所 polish。`quick` では出さない

同 severity 内は到達範囲とレバレッジ順。トークンや共有コンポーネントの修正を、葉コンポーネント1箇所より優先する。

### 6. 系統的 Finding は1行にまとめる

1つの根因は1行。影響箇所は同じ行に列挙する。上限を埋めるための水増し禁止。短報や Findings ゼロも正当な結果。

### 7. 自制を可視化する（Considered but Rejected）

見たが直さない候補を残す。正本が現状を許す、証拠不足、意図的な案件慣習、複雑さだけ増えて便益がない、のいずれか。

| Mode | 件数めやす |
| --- | --- |
| `quick` | 1〜3 |
| `full` | 2〜5 |

実在の候補だけ書く。埋め草を作らない。

### 8. 検証できるものは検証する

プロジェクト内の安全な check を走らせる。見た目判断が必要ならレンダーを見る。コマンドまたは操作手順と観測結果を書く。できない検査は **Not verified** とし、Verification 欠落を Finding に変換しない。

UI Polish Loop 配下では、少なくとも次を意識する:

```bash
pnpm run loop:ui
pnpm run loop:evaluate
pnpm run loop:evaluator
```

### 9. 既定は変更しない

レビュー依頼だけではソースを編集しない。実装も依頼されたら、このレポートの Finding を変更範囲とし、検証を再実行する。Hard Boundary・変更契約ゲートは通常どおり。

## Common Mistakes

| Mistake | Fix |
| --- | --- |
| 6領域のバラバラ報告 | 1つの Findings 表に統合する |
| 同じ問題を複数行 | 所有者ドメインに1回だけ |
| 位置のない Finding | `path:line` と現状を書く |
| ソースだけ見て見た目断定 | レンダー確認 or Not verified |
| quick で LOW を量産 | 上限と severity を守る |
| 未検査を Clear 扱い | Coverage 表で正直に書く |
| 外部ブランド色へ寄せる提案 | `ui-design.mdc` のトークンを正とする |
| Lucide 等の禁止アイコン提案 | カスタムSVG / 既存画像のみ |
| Approve なのに未対応 Finding | `Needs changes` か `Block` |
| 観察で重複・衝突を書いて Approve | 直して再観察。完成宣言は阻害なし |

## Review Output Format

必ず次の節を使う。

### Scope and Coverage

mode、正確なスコープ、スタック/スタイリング慣習、検査境界を書く。続けて Coverage:

| Domain | Evidence inspected | Result |
| --- | --- | --- |
| Accessibility | ファイル・状態・チェック | Findings 件数 or `Clear` |

6ドメインすべてを載せる。`Clear` = 検査済みで actionable なし。`Not reviewed` は理由必須。

### Findings

severity → 到達範囲の順の1表:

| # | Severity | Domain | Location | Before | After | Why |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | HIGH | Accessibility | `src/Dialog.tsx:42` | アイコンのみボタン | `aria-label="閉じる"` を追加 | 名前のない操作はキーボード/SRで使えない |

Domain 列は `Accessibility` / `Layout` / `Writing` / `Typography` / `Colors` / `UI` のいずれか。モード上限を守る。Findings が無いときは表を省略し「actionable な interface findings なし」と書く。

### Considered but Rejected

| Location | Candidate | Rejected because |
| --- | --- | --- |
| `src/Card.tsx:28` | 影を強くする | 業務UIは境界線優先。強影はモーダル階層のみ |

### Verification

実施した check / 操作、手順、観測結果。Not verified を分ける。

### Verdict

次のいずれか1つで終える:

- `Block` — `HIGH` が残っている
- `Needs changes` — `MEDIUM` / `LOW` のみ残っている
- `Approve` — actionable なし、かつ主張した Coverage を検証済み

## UI Polish Loop との接続

| Loop ノード | このスキルの役割 |
| --- | --- |
| ① 抽出 / ② 契約 | 使わない（生成前工程） |
| ③ 生成 | 実装依頼時のみ、Findings を変更範囲にする |
| ④ 判定 | **Interface Review（quick または full）を実行**し、Verdict を完成根拠に含める |
| ⑤ 完成宣言 | Verdict と Verification を宣言へ転記。`Block` なら完成報告禁止 |

UI Polish の完成宣言に次を足す:

```text
- Interface Review: quick|full / Block|Needs changes|Approve
- Findings: HIGH n / MEDIUM n / LOW n（または なし）
```

`Block` または完成条件未達の `Needs changes` は、生成ノードへ差し戻す（iteration が残っている場合）。
