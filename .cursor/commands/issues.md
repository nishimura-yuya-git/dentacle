---
description: >-
  ご意見チャット由来の GitHub Issue を読み、分類・対応・検証・お知らせ提案まで一発で進める。
  「/issues」「issueを処理して」「#8を処理して」と言われたときに使う。
globs:
alwaysApply: false
---

# Issues

ご意見チャットから作られた GitHub Issue を、このコマンド1回で処理する。

院に見える返答の正本は GitHub ではなく、お知らせ（`/announcements`）の提案である。
「直した」「確認した」だけの自己申告で完成にしない。

呼び出し名は **`/issues`**。旧名 `/resolve-issue` は使わない。

```text
/issues
/issues 8
/issues
#8 を処理して
```

番号が無いときは、オープンなご意見 Issue のうち最新を対象にする。
複数オープンなら一覧を出し、どれを処理するか確認する。

---

## 今回の起点（Issue #8）

このコマンドを作る直接の理由。同じ型の質問が来たら、この節を正とする。

| 項目 | 内容 |
|---|---|
| 番号 | [#8](https://github.com/nishimura-yuya-git/dentacle/issues/8) |
| 本文 | 更新ページに関していつ更新されますか？ |
| 送信画面 | `/calendar`（質問の対象はお知らせ `/announcements`） |
| 分類 | `質問`（実装バグではない） |
| なぜ空に見えるか | 実装・デプロイだけでは院向けお知らせに出ない（§6.55） |
| 一発解消の中身 | 掲載ルールを院向け文面で書き、直近の出荷差分からお知らせ提案を作る。`入れる` は人間 |

空状態の文言「公開中のお知らせはまだありません。」だけ直して閉じない。
質問の本体は **いつ・何が載るか** である。

---

## 実行前に必ず読むもの

1. `PROJECT_MEMORY.md`（§6.54 ご意見 / §6.55 お知らせ / §6.20 個人情報 / §10.30）
2. `.cursor/rules/safety.mdc`
3. `.cursor/rules/understanding-first.mdc`
4. `.cursor/rules/change-contract.mdc`
5. `.cursor/rules/agent-loops.mdc`
6. `.cursor/skills/test-integrity-guardrails/SKILL.md`（不具合のとき）

お知らせを触る・提案文を書く場合は追加で読む。

- `src/pages/Announcements/productUpdatePolicy.ts`
- `src/pages/Announcements/AnnouncementsPage.tsx`
- `src/pages/Announcements/formatProductUpdate.ts`

---

## 絶対禁止

- 院向け文言に `Issue` / `GitHub` / 受付番号 / GitHub URL を書く（§6.54 / §10.30）
- 患者氏名・カルテ番号・住所など PII を Issue コメント・お知らせ・MEMORY・コミットに転記する（§6.20）
- `publish_product_update` をエージェントが実行する。`入れる` は運営の人間（§6.55）
- `product_updates` へのテーブル直書き。書込は RPC のみ
- いきなり `published` でお知らせを作る
- ユーザー承認なしに Issue を close する
- 変更契約なしに業務コア・DB・RLS・Hard Boundary を編集する
- テスト期待値を実装都合で緩める
- 公開エラーや院向け文面に内部用語（Postgres / RLS / GitHub）を出す

---

## STEP 0: Issue を取る

```bash
gh issue view <番号> --json number,title,body,comments,labels,state,url,createdAt
```

番号なし:

```bash
gh issue list --state open --limit 20 --json number,title,createdAt,url
```

本文から次を抜き、推測で埋めない。無い項目は「記載なし」。

- ご意見本文（`## ご意見・不具合` の下）
- 画面パス
- クリニック名 / クリニックID
- 送信者（開発用。院向け文面には出さない）

PII が本文に混ざっていたら、以降の転記を止め、ユーザーに削除方針を確認する。

---

## STEP 1: 分類する

どれか1つ。迷ったら `要確認` にして止めない。`質問` と `不具合` が混ざるなら両方の手順を順にやる。

| 分類 | 例 | 適用 Loop |
|---|---|---|
| `質問` | いつ更新されるか、どこを見ればよいか | 回答＋お知らせ提案。コードは原則触らない |
| `不具合` | 動かない、表示が違う、壊れた | Bug Fix Loop + Regression Guard |
| `改善` | こうしてほしい、分かりにくい | Main Doctor Loop + 必要なら UI Polish |
| `新機能` | 無いものを足してほしい | Main Doctor Loop。DB が要るなら設計から |
| `対象外` | 別案件・運用外・スパム | 実装しない。コメント案だけ |

Issue #8 は `質問`。

---

## STEP 2: 理解レポートと変更契約を出す

`understanding-first.mdc` / `change-contract.mdc` の形式で出す。

質問のみでファイルを触らない場合も、契約は出す。

```text
触るファイル: なし（お知らせ提案文と Issue コメント案のみ）
触らないファイル: 実装・マイグレーション・RPC・RLS
```

ユーザーが最初から「進めて」「一発で」と言っている場合だけ、契約提示後に続けてよい。
Hard Boundary・DB・公開ゲートに触れるなら、それでも承認を待つ。

---

## STEP 3: 分類どおり対応する

### A. 質問

1. `PROJECT_MEMORY.md` と既存画面コピーから、答えの根拠を取る。推測で運用を発明しない。
2. 院向け回答（お知らせ本文）と、開発向けコメントを分ける。
3. 「更新ページはいつ更新されるか」型なら **STEP 4 を必須** にする。
   空状態の説明文だけ直して終わらない。
4. 画面コピーを足す必要があるときだけ、最小の UI 修正契約を出す。

お知らせ掲載ルールの正（§6.55）:

- 正本画面はログイン後 `/announcements`
- 実装・デプロイだけでは院向け一覧に出ない
- 運営が「更新を提案する」→「入れる」としたものだけ見える
- ログイン画面には出さない

### B. 不具合

`loops/goals/bug-fix.md` に従う。

1. 問題文を一次情報のまま残す
2. 期待値の根拠を先に書く
3. 再現テストまたは再現手順
4. 最小修正
5. `pnpm run loop:bugfix` または `loop:evaluate` + `loop:evaluator` と Regression Guard
6. 完成宣言なしは未完成

### C. 改善 / 新機能

Main Doctor Loop。UI 見本や余白依頼なら UI Polish + Overlay 検査。
SSoT 再実装は禁止。既存関数を import する。

### D. 対象外

実装しない。なぜ対象外かを開発コメント案に書く。お知らせは原則作らない。

---

## STEP 4: お知らせ提案を必ず用意する

院への返答経路はお知らせだけである。GitHub コメントは院に届かない。

質問・不具合・改善・新機能で、院が画面上で知る必要がある内容なら提案文を出す。
対象外だけ省略してよい。

直近の出荷差分も見る（空のお知らせを放置しない）。

```bash
git log --oneline -20
```

提案は **1件1環境**。フィールドは画面の「更新を提案する」と揃える。

| 項目 | 値の正 |
|---|---|
| kind | `feature` / `improve` / `fix` |
| title | 日本語。院が読む見出し。装飾英語禁止 |
| body | 日本語。次に何が変わるか。内部用語禁止 |
| surfaces | `all` / `calendar` / `patients` / `contacts` / `users` / `settings` / `import` |
| platform | `web` / `mac` / `windows`。既定は `web`。「すべて」なし |
| detailUrl | 不要なら空 |

エージェントは提案文まで。RPC `propose_product_update` を勝手に叩かない。
ユーザーが「提案を保存して」と明示し、運営として実行する方法が契約にあるときだけ例外。
その場合も `publish_product_update` は呼ばない。

---

## STEP 5: 検証する

コードを触った場合:

```bash
pnpm run doctor
pnpm run test:changed
```

不具合なら Bug Fix の判定ノードまで。UI なら観察証拠（snapshot または screenshot を Read し、差分を1行以上）。

コードを触っていない質問対応でも、根拠にした節（§6.54 / §6.55）と空状態の実文を確認した旨を書く。

---

## STEP 6: 開発用 Issue コメント案を出す

`gh issue comment` は、ユーザーが「コメントして」と言うまで実行しない。
close は「閉じて」が来るまでしない。

コメントに書いてよいもの:

- 分類
- 対応内容（実装した / 質問に答えた / 対象外）
- お知らせ提案の有無（入れる前であることも書く）
- 残作業（人間の `入れる`、本番確認）

コメントに書いてはいけないもの:

- 患者PII
- 認証情報
- 院に見せる完成文面のコピーが GitHub 用語を含むこと（院向け文面は別枠）

---

## 出力フォーマット（この順で出す）

```markdown
## Issues

### 対象
- #<番号> <title>
- 画面: `<path>`
- 分類: 質問 / 不具合 / 改善 / 新機能 / 対象外
- Loop: ...

### ご意見（一次情報）
> （本文をそのまま）

### 判断
- 根拠: PROJECT_MEMORY §... / 画面 ...
- 今回やること:
- やらないこと:

### 対応結果
- コード: 触っていない / 触ったファイル
- 検証: 実行したコマンドと結果
- 未確認: ...

### お知らせ提案（院向け・入れる前）
- kind:
- title:
- body:
- surfaces:
- platform: web
- 保存方法: 運営が `/announcements` で「更新を提案する」→ 確認後「入れる」
- エージェントは入れない

### 開発用コメント案
（GitHub に貼る文。院向け文言ルールはコメント自体には不要だが、PIIは禁止）

### 残作業（人間）
- [ ] `/announcements` で提案を保存する
- [ ] 内容を確認して「入れる」
- [ ] Issue にコメントする（必要なら）
- [ ] Issue を close する（必要なら）
```

---

## 完成判定

すべて満たしたときだけ「解消手順は揃った」と言える。
`入れる` と close は人間残作業でよい。それを残さず「院に伝わった」とは言わない。

1. Issue 本文を一次情報として残している
2. 分類と Loop が書かれている
3. 根拠が `PROJECT_MEMORY.md` または実画面にある
4. コードを触ったなら Evaluation が `stop` ではない
5. 院向けお知らせ提案がある（対象外以外）
6. `入れる` をエージェントが実行していない
7. 院向け文面に Issue / GitHub が無い
8. PII を転記していない

---

## 呼び出し例

```text
/issues 8
```

```text
/issues
オープンなご意見を処理して
```

```text
/issues 8
進めて。お知らせ提案まで出して。入れる操作はしないで
```
